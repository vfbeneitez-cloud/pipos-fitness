/**
 * Objetivo semanal, streak y nudges deterministas.
 * Input: items desc (más reciente primero).
 */

export type Goal = { percent: number };

export type TrendItem = {
  weekStart: string;
  totalPercent: number;
  trainingPercent?: number;
  nutritionPercent?: number;
};

export type Streak = {
  goalPercent: number;
  currentStreakWeeks: number;
  bestStreakWeeks?: number;
};

export type NudgeType = "ON_TRACK" | "BEHIND_GOAL" | "NEW_STREAK" | "STREAK_BROKEN";

export type Nudge = {
  type: NudgeType;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
};

const GAP_HIGH_THRESHOLD = 20;
const DEFAULT_GOAL = 70;

export function computeStreak(itemsDesc: TrendItem[], goalPercent: number = DEFAULT_GOAL): Streak {
  let currentStreak = 0;
  for (const item of itemsDesc) {
    if (item.totalPercent >= goalPercent) currentStreak++;
    else break;
  }

  let bestStreak = 0;
  let running = 0;
  for (const item of itemsDesc) {
    if (item.totalPercent >= goalPercent) {
      running++;
      bestStreak = Math.max(bestStreak, running);
    } else {
      running = 0;
    }
  }

  return {
    goalPercent,
    currentStreakWeeks: currentStreak,
    bestStreakWeeks: bestStreak > 0 ? bestStreak : undefined,
  };
}

export type NudgeParams = {
  currentWeekPercent: number;
  goalPercent: number;
  previousWeekPercent?: number | null;
  currentStreakWeeks: number;
  previousStreakWeeks?: number | null;
};

export function getWeeklyNudge(params: NudgeParams): Nudge {
  const { currentWeekPercent, goalPercent, currentStreakWeeks, previousStreakWeeks = 0 } = params;

  if (currentWeekPercent >= goalPercent) {
    if (currentStreakWeeks >= 2 && currentStreakWeeks > (previousStreakWeeks ?? 0)) {
      return {
        type: "NEW_STREAK",
        severity: "low",
        title: "¡Racha en marcha!",
        detail: `Llevas ${currentStreakWeeks} semana(s) cumpliendo el objetivo. Sigue así.`,
      };
    }
    return {
      type: "ON_TRACK",
      severity: "low",
      title: "Objetivo cumplido",
      detail: `${currentWeekPercent}% esta semana. Mantén el ritmo.`,
    };
  }

  if ((previousStreakWeeks ?? 0) >= 2 && currentStreakWeeks === 0) {
    return {
      type: "STREAK_BROKEN",
      severity: "medium",
      title: "Racha rota",
      detail: "Esta semana no alcanzaste el objetivo. Revisa qué te impidió seguir el plan.",
    };
  }

  const pct = Math.round(Number(currentWeekPercent));
  const goal = Math.round(Number(goalPercent));
  const gap = Math.max(0, Math.min(100, goal) - Math.max(0, Math.min(100, pct)));
  const severity = gap >= GAP_HIGH_THRESHOLD ? "high" : "medium";

  return {
    type: "BEHIND_GOAL",
    severity,
    title: "Por debajo del objetivo",
    detail: `${pct}% vs objetivo ${goal}%. Te faltan ${gap} puntos.`,
  };
}
