import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";

const LogBody = z.object({
  planId: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
  sessionName: z.string().optional(),
  dayIndex: z.number().int().min(0).max(6).optional(),
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

  const { planId, occurredAt, sessionName, dayIndex, completed, difficulty, pain, painNotes } =
    parsed.data;

  if (planId) {
    const plan = await prisma.weeklyPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return { status: 404, body: { error: "PLAN_NOT_FOUND" } };
    }
  }

  let resolvedOccurredAt: Date;
  if (occurredAt) {
    resolvedOccurredAt = new Date(occurredAt);
  } else if (dayIndex !== undefined) {
    const d = new Date();
    const day = d.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(d);
    weekStart.setUTCDate(d.getUTCDate() + mondayOffset);
    weekStart.setUTCHours(0, 0, 0, 0);
    resolvedOccurredAt = new Date(weekStart);
    resolvedOccurredAt.setUTCDate(weekStart.getUTCDate() + dayIndex);
  } else {
    resolvedOccurredAt = new Date();
  }

  const log = await prisma.trainingLog.create({
    data: {
      userId,
      planId: planId ?? null,
      occurredAt: resolvedOccurredAt,
      sessionName: sessionName ?? "Entrenamiento libre",
      completed,
      difficulty: difficulty ?? null,
      pain,
      painNotes: painNotes ?? null,
    },
  });

  return { status: 200, body: log };
}
