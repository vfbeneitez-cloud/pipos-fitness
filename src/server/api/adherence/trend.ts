import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";
import { getRecentWeekStartsUtc } from "./weekRange";

const GetQuery = z.object({
  weeks: z.coerce.number().int().min(1).max(52).optional().default(8),
});

export async function getWeeklyTrend(userId: string, url: string, options?: { asOf?: Date }) {
  const u = new URL(url);
  const raw = u.searchParams.get("weeks");
  const parsed = GetQuery.safeParse({
    weeks: raw === null || raw === "" ? undefined : raw,
  });

  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_QUERY", error_code: "INVALID_QUERY" } };
  }

  const weeks = parsed.data.weeks;
  const weekStartsUtc = getRecentWeekStartsUtc(weeks, options?.asOf);

  const snapshots = await prisma.weeklyAdherenceSnapshot.findMany({
    where: {
      userId,
      weekStart: { in: weekStartsUtc },
    },
    orderBy: { weekStart: "desc" },
  });

  const foundWeekStarts = new Set(snapshots.map((s) => s.weekStart.toISOString().slice(0, 10)));
  const missing = weekStartsUtc
    .map((d) => d.toISOString().slice(0, 10))
    .filter((ws) => !foundWeekStarts.has(ws));

  const items = snapshots.map((s) => ({
    weekStart: s.weekStart.toISOString().slice(0, 10),
    computedAt: s.computedAt.toISOString(),
    trainingPercent: s.trainingPercent,
    nutritionPercent: s.nutritionPercent,
    totalPercent: s.totalPercent,
    breakdown: s.breakdownJson as {
      training: { planned: number; completed: number; percent: number };
      nutrition: { planned: number; completed: number; percent: number };
      totalPercent: number;
    },
  }));

  return {
    status: 200,
    body: {
      weeks,
      items,
      missing,
    },
  };
}
