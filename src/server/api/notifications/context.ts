/**
 * Contexto mínimo para generar notificaciones. Reutiliza lógica de adherence.
 */
import { getWeekStart } from "@/src/app/lib/week";
import { getGoal } from "@/src/server/api/adherence/goal";
import { getWeeklyTrend } from "@/src/server/api/adherence/trend";
import { getWeeklySnapshot } from "@/src/server/api/adherence/snapshotGet";
import { getWeeklyAdherence } from "@/src/server/api/adherence/weekly";
import { computeStreak, getWeeklyNudge } from "@/src/core/adherence/goals";

export type NotificationContext = {
  goalPercent: number;
  weekStart: string;
  currentWeekPercent: number | null;
  nudge: { type: string; severity?: string };
};

export async function getNotificationContext(
  userId: string,
  runDateUtc: Date,
): Promise<NotificationContext> {
  const weekStartStr = getWeekStart(runDateUtc);

  const [goalResult, trendResult] = await Promise.all([
    getGoal(userId),
    getWeeklyTrend(userId, `http://x?weeks=8`, { asOf: runDateUtc }),
  ]);

  const goalPercent =
    goalResult.status === 200 ? (goalResult.body as { goalPercent: number }).goalPercent : 70;

  const items =
    trendResult.status === 200
      ? (trendResult.body as { items: { weekStart: string; totalPercent: number }[] }).items
      : [];

  const weekStartUtc = new Date(`${weekStartStr}T00:00:00.000Z`);
  const snapshotResult = await getWeeklySnapshot(userId, weekStartUtc);

  let currentWeekPercent: number | null = null;

  if (snapshotResult.status === 200) {
    const snap = snapshotResult.body as { totalPercent: number };
    currentWeekPercent = snap.totalPercent;
  } else {
    const weeklyResult = await getWeeklyAdherence(`http://x?weekStart=${weekStartStr}`, userId);
    if (weeklyResult.status === 200) {
      const w = weeklyResult.body as { totalPercent: number };
      currentWeekPercent = w.totalPercent;
    }
  }

  const trendItems = items.map((i) => ({
    weekStart: i.weekStart,
    totalPercent: i.totalPercent,
    trainingPercent: 0,
    nutritionPercent: 0,
  }));

  const virtualItems =
    currentWeekPercent != null && (items.length === 0 || items[0].weekStart !== weekStartStr)
      ? [
          {
            weekStart: weekStartStr,
            totalPercent: currentWeekPercent,
            trainingPercent: 0,
            nutritionPercent: 0,
          },
          ...trendItems,
        ]
      : trendItems;

  const streak = computeStreak(virtualItems, goalPercent);
  const previousStreak =
    virtualItems.length >= 2
      ? computeStreak(virtualItems.slice(1), goalPercent).currentStreakWeeks
      : 0;

  const nudge =
    currentWeekPercent != null
      ? getWeeklyNudge({
          currentWeekPercent,
          goalPercent,
          previousWeekPercent: items.find((i) => {
            const d = new Date(`${weekStartStr}T00:00:00.000Z`);
            d.setUTCDate(d.getUTCDate() - 7);
            return i.weekStart === d.toISOString().slice(0, 10);
          })?.totalPercent,
          currentStreakWeeks: streak.currentStreakWeeks,
          previousStreakWeeks: previousStreak,
        })
      : { type: "ON_TRACK" as const, severity: "low" as const };

  return {
    goalPercent,
    weekStart: weekStartStr,
    currentWeekPercent,
    nudge,
  };
}
