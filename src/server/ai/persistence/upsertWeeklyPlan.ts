/**
 * Persist weekly plan (training + nutrition JSON) for a user/week.
 * Used by adjustWeeklyPlan. Logic unchanged; extract only.
 */
import { prisma } from "@/src/server/db/prisma";
import type { Prisma } from "@prisma/client";

export type UpsertWeeklyPlanParams = {
  userId: string;
  weekStart: Date;
  trainingJson: Prisma.InputJsonValue;
  nutritionJson: Prisma.InputJsonValue;
  lastRationale?: string;
  lastGeneratedAt?: Date;
};

export async function upsertWeeklyPlan(params: UpsertWeeklyPlanParams) {
  const { userId, weekStart, trainingJson, nutritionJson, lastRationale, lastGeneratedAt } = params;
  return prisma.weeklyPlan.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: {
      trainingJson,
      nutritionJson,
      status: "DRAFT",
      ...(lastRationale != null && { lastRationale }),
      ...(lastGeneratedAt != null && { lastGeneratedAt }),
    },
    create: {
      userId,
      weekStart,
      status: "DRAFT",
      trainingJson,
      nutritionJson,
      ...(lastRationale != null && { lastRationale }),
      ...(lastGeneratedAt != null && { lastGeneratedAt }),
    },
  });
}
