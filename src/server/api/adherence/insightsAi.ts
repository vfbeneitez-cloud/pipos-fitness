import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";
import { computeWeeklyAdherence } from "@/src/core/adherence/computeWeeklyAdherence";
import { getWeeklyAdherenceInsights } from "@/src/core/adherence/insights";
import { generateAdherenceCoach, type AiCoach, type CoachMeta } from "@/src/server/ai/adherenceCoach";

const GetQuery = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function normalizeWeekStart(weekStart: string): Date {
  return new Date(`${weekStart}T00:00:00.000Z`);
}

const ADHERENCE_AI_COACH_ENABLED =
  process.env.ADHERENCE_AI_COACH_ENABLED === "true" || process.env.ADHERENCE_AI_COACH_ENABLED === "1";

export async function getWeeklyAdherenceInsightsAiHandler(
  url: string,
  userId: string,
  options: { requestId?: string } = {},
) {
  const u = new URL(url);
  const parsed = GetQuery.safeParse({
    weekStart: u.searchParams.get("weekStart") ?? "",
  });
  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_QUERY", error_code: "INVALID_QUERY" } };
  }

  const weekStart = normalizeWeekStart(parsed.data.weekStart);
  const weekStartStr = parsed.data.weekStart;

  const plan = await prisma.weeklyPlan.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
    select: { trainingJson: true, nutritionJson: true },
  });

  if (!plan) {
    return {
      status: 404,
      body: {
        error: "PLAN_NOT_FOUND",
        error_code: "PLAN_NOT_FOUND",
        message: "Plan no encontrado.",
      },
    };
  }

  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 7);

  const [trainingLogs, nutritionLogs] = await Promise.all([
    prisma.trainingLog.findMany({
      where: {
        userId,
        occurredAt: { gte: weekStart, lt: end },
      },
      select: { occurredAt: true, completed: true },
    }),
    prisma.nutritionLog.findMany({
      where: {
        userId,
        occurredAt: { gte: weekStart, lt: end },
      },
      select: { occurredAt: true, followedPlan: true },
    }),
  ]);

  const trainingJson = (plan.trainingJson ?? {}) as {
    sessions?: { dayIndex: number }[];
    environment?: string;
    daysPerWeek?: number;
    sessionMinutes?: number;
  };
  const nutritionJson = (plan.nutritionJson ?? {}) as {
    days?: { dayIndex: number; meals: unknown[] }[];
    mealsPerDay?: number;
    cookingTime?: string;
  };

  const breakdown = computeWeeklyAdherence(
    trainingJson,
    nutritionJson,
    trainingLogs.map((l) => ({ occurredAt: l.occurredAt, completed: l.completed })),
    nutritionLogs.map((l) => ({ occurredAt: l.occurredAt, followedPlan: l.followedPlan })),
    weekStart,
  );

  const planInput = {
    sessions: trainingJson.sessions ?? [],
    days: nutritionJson.days ?? [],
    mealsPerDay: nutritionJson.mealsPerDay ?? 3,
    cookingTime: nutritionJson.cookingTime,
  };

  const insightsResult = getWeeklyAdherenceInsights({
    breakdown,
    plan: planInput,
    trainingLogs: trainingLogs.map((l) => ({ occurredAt: l.occurredAt, completed: l.completed })),
    nutritionLogs: nutritionLogs.map((l) => ({
      occurredAt: l.occurredAt,
      followedPlan: l.followedPlan,
    })),
    weekStart,
  });

  let coach: AiCoach | null = null;
  let coachMeta: CoachMeta | null = null;

  if (ADHERENCE_AI_COACH_ENABLED) {
    const aiResult = await generateAdherenceCoach(
      {
        weekStart: weekStartStr,
        trainingPlan: {
          environment: trainingJson.environment,
          daysPerWeek: trainingJson.daysPerWeek,
          sessionMinutes: trainingJson.sessionMinutes,
        },
        nutritionPlan: {
          mealsPerDay: nutritionJson.mealsPerDay,
          cookingTime: nutritionJson.cookingTime,
        },
        breakdown,
        insights: insightsResult.insights,
        nextAction: insightsResult.nextAction,
      },
      { requestId: options.requestId },
    );
    if (aiResult.ok) {
      coach = aiResult.coach;
      coachMeta = aiResult.meta;
    }
  }

  return {
    status: 200,
    body: {
      weekStart: weekStartStr,
      breakdown,
      insights: insightsResult.insights,
      nextAction: insightsResult.nextAction,
      coach,
      coachMeta,
      computedAt: new Date().toISOString(),
    },
  };
}
