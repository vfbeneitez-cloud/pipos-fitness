import { z } from "zod";
import { getWeekStart } from "@/src/app/lib/week";
import { getGoal } from "./goal";
import { getWeeklyTrend } from "./trend";
import { getWeeklySnapshot } from "./snapshotGet";
import { getWeeklyAdherence } from "./weekly";
import { computeStreak, getWeeklyNudge } from "@/src/core/adherence/goals";
import { getAdherenceAlerts } from "@/src/core/adherence/alerts";
import { trackEvent } from "@/src/server/lib/events";

const GetQuery = z.object({
  weeks: z.coerce.number().int().min(1).max(52).optional().default(8),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function getAdherenceSummary(userId: string, url: string) {
  const u = new URL(url);
  const rawWeeks = u.searchParams.get("weeks");
  const rawWeekStart = u.searchParams.get("weekStart");
  const parsed = GetQuery.safeParse({
    weeks: rawWeeks === null || rawWeeks === "" ? undefined : rawWeeks,
    weekStart: rawWeekStart === null || rawWeekStart === "" ? undefined : rawWeekStart,
  });

  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_QUERY", error_code: "INVALID_QUERY" } };
  }

  const weeks = parsed.data.weeks;
  const weekStartStr = parsed.data.weekStart ?? getWeekStart(new Date());

  const [goalResult, trendResult] = await Promise.all([
    getGoal(userId),
    getWeeklyTrend(userId, `${url.split("?")[0]}?weeks=${weeks}`),
  ]);

  if (goalResult.status !== 200) return goalResult;
  if (trendResult.status !== 200) return trendResult;

  const goalPercent = (goalResult.body as { goalPercent: number }).goalPercent;
  const trendBody = trendResult.body as {
    weeks: number;
    items: {
      weekStart: string;
      totalPercent: number;
      trainingPercent: number;
      nutritionPercent: number;
      computedAt?: string;
    }[];
    missing: string[];
  };

  const items = trendBody.items;

  let currentWeek: {
    weekStart: string;
    totalPercent: number;
    trainingPercent: number;
    nutritionPercent: number;
    source: "snapshot" | "live";
    computedAt?: string;
  } | null = null;

  const weekStartUtc = new Date(`${weekStartStr}T00:00:00.000Z`);
  const snapshotResult = await getWeeklySnapshot(userId, weekStartUtc);

  if (snapshotResult.status === 200) {
    const snap = snapshotResult.body as {
      weekStart: string;
      totalPercent: number;
      trainingPercent: number;
      nutritionPercent: number;
      computedAt: string;
    };
    currentWeek = {
      weekStart: snap.weekStart,
      totalPercent: snap.totalPercent,
      trainingPercent: snap.trainingPercent,
      nutritionPercent: snap.nutritionPercent,
      source: "snapshot",
      computedAt: snap.computedAt,
    };
  } else {
    const weeklyUrl = `http://x?weekStart=${weekStartStr}`;
    const weeklyResult = await getWeeklyAdherence(weeklyUrl, userId);
    if (weeklyResult.status === 200) {
      const w = weeklyResult.body as {
        weekStart: string;
        totalPercent: number;
        training: { percent: number };
        nutrition: { percent: number };
        computedAt: string;
      };
      currentWeek = {
        weekStart: w.weekStart,
        totalPercent: w.totalPercent,
        trainingPercent: w.training.percent,
        nutritionPercent: w.nutrition.percent,
        source: "live",
        computedAt: w.computedAt,
      };
    }
  }

  const prevWeekStartStr = (() => {
    const d = new Date(`${weekStartStr}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  })();
  const prevWeekItem = items.find((i) => i.weekStart === prevWeekStartStr);
  const previousWeek = prevWeekItem
    ? { weekStart: prevWeekItem.weekStart, totalPercent: prevWeekItem.totalPercent }
    : undefined;

  const trendItems = items.map((i) => ({
    weekStart: i.weekStart,
    totalPercent: i.totalPercent,
    trainingPercent: i.trainingPercent,
    nutritionPercent: i.nutritionPercent,
  }));

  const virtualItems =
    currentWeek && (items.length === 0 || items[0].weekStart !== currentWeek.weekStart)
      ? [
          {
            weekStart: currentWeek.weekStart,
            totalPercent: currentWeek.totalPercent,
            trainingPercent: currentWeek.trainingPercent,
            nutritionPercent: currentWeek.nutritionPercent,
          },
          ...trendItems,
        ]
      : trendItems;

  const streak = computeStreak(virtualItems, goalPercent);
  const previousStreak =
    currentWeek && virtualItems.length >= 2
      ? computeStreak(virtualItems.slice(1), goalPercent).currentStreakWeeks
      : trendItems.length >= 2
        ? computeStreak(trendItems.slice(1), goalPercent).currentStreakWeeks
        : 0;

  const nudge = currentWeek
    ? getWeeklyNudge({
        currentWeekPercent: currentWeek.totalPercent,
        goalPercent,
        previousWeekPercent: previousWeek?.totalPercent,
        currentStreakWeeks: streak.currentStreakWeeks,
        previousStreakWeeks: previousStreak,
      })
    : {
        type: "ON_TRACK" as const,
        severity: "low" as const,
        title: "Sin datos esta semana",
        detail: "Crea un plan y registra entrenamientos/comidas para ver tu progreso.",
      };

  trackEvent("adherence_nudge_shown", {
    type: nudge.type,
    severity: nudge.severity,
    weekStart: weekStartStr,
    goalPercent,
    source: currentWeek?.source ?? "none",
  });

  const alerts = getAdherenceAlerts(trendItems);

  return {
    status: 200,
    body: {
      goalPercent,
      streak: {
        currentStreakWeeks: streak.currentStreakWeeks,
        goalPercent: streak.goalPercent,
        bestStreakWeeks: streak.bestStreakWeeks,
      },
      currentWeek,
      previousWeek,
      nudge,
      trend: { items, missing: trendBody.missing },
      alerts,
    },
  };
}
