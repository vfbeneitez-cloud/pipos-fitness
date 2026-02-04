import { prisma } from "@/src/server/db/prisma";

export async function getWeeklySnapshot(userId: string, weekStartUtc: Date) {
  const snapshot = await prisma.weeklyAdherenceSnapshot.findUnique({
    where: {
      userId_weekStart: { userId, weekStart: weekStartUtc },
    },
  });

  if (!snapshot) {
    return {
      status: 404,
      body: {
        error: "SNAPSHOT_NOT_FOUND",
        error_code: "SNAPSHOT_NOT_FOUND",
        message: "Snapshot no encontrado.",
      },
    };
  }

  const breakdown = snapshot.breakdownJson as {
    training: { planned: number; completed: number; percent: number };
    nutrition: { planned: number; completed: number; percent: number };
    totalPercent: number;
    schemaVersion?: number;
    method?: string;
  };

  return {
    status: 200,
    body: {
      id: snapshot.id,
      weekStart: snapshot.weekStart.toISOString().slice(0, 10),
      computedAt: snapshot.computedAt.toISOString(),
      trainingPercent: snapshot.trainingPercent,
      nutritionPercent: snapshot.nutritionPercent,
      totalPercent: snapshot.totalPercent,
      breakdown,
    },
  };
}
