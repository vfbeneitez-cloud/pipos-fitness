/**
 * Pure adherence computation. No Prisma/Next.
 * TZ: week range uses UTC (aligned with getWeekStart and createTrainingLog).
 */

export type TrainingSessionInput = { dayIndex: number; name?: string };
export type NutritionDayInput = { dayIndex: number; meals: unknown[] };

export type TrainingPlanInput = { sessions?: TrainingSessionInput[] };
export type NutritionPlanInput = { days?: NutritionDayInput[]; mealsPerDay?: number };

export type TrainingLogInput = { occurredAt: Date | string; completed: boolean };
export type NutritionLogInput = { occurredAt: Date | string; followedPlan: boolean };

export type AdherenceResult = {
  training: { planned: number; completed: number; percent: number };
  nutrition: { planned: number; completed: number; percent: number };
  totalPercent: number;
};

/** Week range: [weekStart, weekStart+7d) in UTC. */
function getWeekRange(weekStart: Date): { start: Date; end: Date } {
  const start = new Date(weekStart);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

function inRange(occurredAt: Date | string, start: Date, end: Date): boolean {
  const d = new Date(occurredAt);
  return d >= start && d < end;
}

/** Monday=0, Sunday=6 (same as getTodayDayIndex). */
function dayIndexFromDate(d: Date): number {
  const day = d.getUTCDay();
  return day === 0 ? 6 : day - 1;
}

export function computeWeeklyAdherence(
  trainingPlan: TrainingPlanInput,
  nutritionPlan: NutritionPlanInput,
  trainingLogs: TrainingLogInput[],
  nutritionLogs: NutritionLogInput[],
  weekStart: Date,
): AdherenceResult {
  const { start, end } = getWeekRange(weekStart);

  const sessions = trainingPlan?.sessions ?? [];
  const plannedTraining = sessions.length;

  const completedTrainingSet = new Set<number>();
  for (const log of trainingLogs) {
    if (!log.completed) continue;
    if (!inRange(log.occurredAt, start, end)) continue;
    const d = new Date(log.occurredAt);
    completedTrainingSet.add(dayIndexFromDate(d));
  }
  const completedTraining = Math.min(completedTrainingSet.size, plannedTraining);

  const days = nutritionPlan?.days ?? [];
  const mealsPerDay = nutritionPlan?.mealsPerDay ?? 3;
  const plannedNutrition = days.reduce((sum, d) => sum + (d.meals?.length ?? 0), 0);

  // Group by day UTC, count only followedPlan=true, cap each day to mealsPerDay
  const logsInRange = nutritionLogs.filter(
    (log) => inRange(log.occurredAt, start, end) && log.followedPlan,
  );
  const dayCounts = new Map<string, number>();
  for (const log of logsInRange) {
    const d = new Date(log.occurredAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const current = dayCounts.get(key) ?? 0;
    if (current < mealsPerDay) dayCounts.set(key, current + 1);
  }
  const completedNutrition = Array.from(dayCounts.values()).reduce((sum, n) => sum + n, 0);

  const trainingPercent =
    plannedTraining > 0 ? Math.round((completedTraining / plannedTraining) * 100) : 0;
  const nutritionPercent =
    plannedNutrition > 0 ? Math.round((completedNutrition / plannedNutrition) * 100) : 0;

  const totalPlanned = plannedTraining + plannedNutrition;
  const totalCompleted = completedTraining + completedNutrition;
  const totalPercent = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

  return {
    training: { planned: plannedTraining, completed: completedTraining, percent: trainingPercent },
    nutrition: {
      planned: plannedNutrition,
      completed: completedNutrition,
      percent: nutritionPercent,
    },
    totalPercent,
  };
}
