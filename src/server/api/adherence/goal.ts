import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";

const DEFAULT_GOAL = 70;

export async function getGoal(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { adherenceGoalPercent: true },
  });

  const goalPercent = profile?.adherenceGoalPercent ?? DEFAULT_GOAL;

  return {
    status: 200,
    body: { goalPercent },
  };
}

const SetGoalBody = z.object({
  goalPercent: z.number().int().min(0).max(100),
});

export async function setGoal(userId: string, body: unknown) {
  const parsed = SetGoalBody.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: "INVALID_BODY",
        error_code: "INVALID_BODY",
        message: "goalPercent debe ser 0-100.",
      },
    };
  }

  const { goalPercent } = parsed.data;

  await prisma.userProfile.upsert({
    where: { userId },
    update: { adherenceGoalPercent: goalPercent },
    create: {
      userId,
      adherenceGoalPercent: goalPercent,
    },
  });

  return {
    status: 200,
    body: { goalPercent },
  };
}
