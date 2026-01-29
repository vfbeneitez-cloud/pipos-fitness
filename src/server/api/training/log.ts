import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";

const LogBody = z.object({
  planId: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
  sessionName: z.string().optional(),
  completed: z.boolean(),
  difficulty: z.enum(["easy", "ok", "hard"]).optional(),
  pain: z.boolean(),
  painNotes: z.string().optional(),
});

export async function createTrainingLog(body: unknown, userId: string) {
  const parsed = LogBody.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_BODY", details: parsed.error.flatten() } };
  }

  const { planId, occurredAt, sessionName, completed, difficulty, pain, painNotes } = parsed.data;

  if (planId) {
    const plan = await prisma.weeklyPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return { status: 404, body: { error: "PLAN_NOT_FOUND" } };
    }
  }

  const log = await prisma.trainingLog.create({
    data: {
      userId,
      planId: planId ?? null,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      sessionName: sessionName ?? null,
      completed,
      difficulty: difficulty ?? null,
      pain,
      painNotes: painNotes ?? null,
    },
  });

  return { status: 200, body: log };
}
