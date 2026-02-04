import { prisma } from "@/src/server/db/prisma";
import { computeWeeklyAdherence } from "@/src/core/adherence/computeWeeklyAdherence";
import { parseWeekStartParam } from "./weekRange";

export async function recomputeWeeklySnapshot(userId: string, weekStartStr: string) {
  const parsed = parseWeekStartParam(weekStartStr);
  if (!parsed.ok) {
    return { status: 400, body: { error: "INVALID_QUERY", error_code: "INVALID_QUERY" } };
  }

  const { weekStartUtc, weekEndUtc } = parsed;

  const plan = await prisma.weeklyPlan.findUnique({
    where: { userId_weekStart: { userId, weekStart: weekStartUtc } },
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

  const [trainingLogs, nutritionLogs] = await Promise.all([
    prisma.trainingLog.findMany({
      where: {
        userId,
        occurredAt: { gte: weekStartUtc, lt: weekEndUtc },
      },
      select: { occurredAt: true, completed: true },
    }),
    prisma.nutritionLog.findMany({
      where: {
        userId,
        occurredAt: { gte: weekStartUtc, lt: weekEndUtc },
      },
      select: { occurredAt: true, followedPlan: true },
    }),
  ]);

  const trainingPlan = (plan.trainingJson ?? {}) as { sessions?: { dayIndex: number }[] };
  const nutritionPlan = (plan.nutritionJson ?? {}) as {
    days?: { dayIndex: number; meals: unknown[] }[];
    mealsPerDay?: number;
  };

  let result;
  try {
    result = computeWeeklyAdherence(
      trainingPlan,
      nutritionPlan,
      trainingLogs.map((l) => ({ occurredAt: l.occurredAt, completed: l.completed })),
      nutritionLogs.map((l) => ({ occurredAt: l.occurredAt, followedPlan: l.followedPlan })),
      weekStartUtc,
    );
  } catch {
    return {
      status: 400,
      body: {
        error: "INVALID_PLAN_DATA",
        error_code: "INVALID_PLAN_DATA",
        message: "Plan o logs inválidos.",
      },
    };
  }

  const breakdownJson = {
    training: result.training,
    nutrition: result.nutrition,
    totalPercent: result.totalPercent,
    schemaVersion: 1,
    method: "v1" as const,
    computedFrom: "snapshot_recompute" as const,
    adherenceVersion: 1,
  };

  const snapshot = await prisma.weeklyAdherenceSnapshot.upsert({
    where: {
      userId_weekStart: { userId, weekStart: weekStartUtc },
    },
    create: {
      userId,
      weekStart: weekStartUtc,
      trainingPercent: result.training.percent,
      nutritionPercent: result.nutrition.percent,
      totalPercent: result.totalPercent,
      breakdownJson,
    },
    update: {
      trainingPercent: result.training.percent,
      nutritionPercent: result.nutrition.percent,
      totalPercent: result.totalPercent,
      breakdownJson,
      computedAt: new Date(),
    },
  });

  return {
    status: 200,
    body: {
      id: snapshot.id,
      weekStart: snapshot.weekStart.toISOString().slice(0, 10),
      computedAt: snapshot.computedAt.toISOString(),
      trainingPercent: snapshot.trainingPercent,
      nutritionPercent: snapshot.nutritionPercent,
      totalPercent: snapshot.totalPercent,
      breakdown: breakdownJson,
    },
  };
}
