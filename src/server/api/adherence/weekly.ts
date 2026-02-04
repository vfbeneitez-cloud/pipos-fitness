import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";
import { computeWeeklyAdherence } from "@/src/core/adherence/computeWeeklyAdherence";

const GetQuery = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function normalizeWeekStart(weekStart: string): Date {
  return new Date(`${weekStart}T00:00:00.000Z`);
}

export async function getWeeklyAdherence(url: string, userId: string) {
  const u = new URL(url);
  const parsed = GetQuery.safeParse({
    weekStart: u.searchParams.get("weekStart") ?? "",
  });
  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_QUERY", error_code: "INVALID_QUERY" } };
  }

  const weekStart = normalizeWeekStart(parsed.data.weekStart);

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

  const trainingPlan = (plan.trainingJson ?? {}) as { sessions?: { dayIndex: number }[] };
  const nutritionPlan = (plan.nutritionJson ?? {}) as {
    days?: { dayIndex: number; meals: unknown[] }[];
    mealsPerDay?: number;
  };

  const result = computeWeeklyAdherence(
    trainingPlan,
    nutritionPlan,
    trainingLogs.map((l) => ({ occurredAt: l.occurredAt, completed: l.completed })),
    nutritionLogs.map((l) => ({ occurredAt: l.occurredAt, followedPlan: l.followedPlan })),
    weekStart,
  );

  const weekStartStr = parsed.data.weekStart;
  return {
    status: 200,
    body: {
      weekStart: weekStartStr,
      computedAt: new Date().toISOString(),
      method: "v1_daily_cap" as const,
      ...result,
    },
  };
}
