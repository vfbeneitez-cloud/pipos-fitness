import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";

const LogBody = z.object({
  occurredAt: z.string().datetime().optional(),
  mealName: z.string().optional(),
  followedPlan: z.boolean(),
  hunger: z.enum(["low", "ok", "high"]).optional(),
  notes: z.string().optional(),
});

export async function createNutritionLog(body: unknown, userId: string) {
  const parsed = LogBody.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_BODY", details: parsed.error.flatten() } };
  }

  const { occurredAt, mealName, followedPlan, hunger, notes } = parsed.data;

  const log = await prisma.nutritionLog.create({
    data: {
      userId,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      mealName: mealName ?? null,
      followedPlan,
      hunger: hunger ?? null,
      notes: notes ?? null,
    },
  });

  return { status: 200, body: log };
}
