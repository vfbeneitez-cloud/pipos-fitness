/**
 * Deterministic adherence insights. No Prisma/Next.
 * Reuses same UTC/day logic as computeWeeklyAdherence.
 */

import type { AdherenceResult } from "./computeWeeklyAdherence";

export type InsightType =
  | "TRAINING_LOW_ADHERENCE"
  | "NUTRITION_LOW_ADHERENCE"
  | "MISSED_TRAINING_DAYS"
  | "MISSED_MEALS_DAYS"
  | "CONSISTENCY_ISSUE"
  | "PLAN_TOO_AMBITIOUS";

export type Insight = {
  type: InsightType;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
};

export type NextActionType =
  | "REDUCE_DAYS_PER_WEEK"
  | "REDUCE_MEALS_PER_DAY"
  | "SCHEDULE_REMINDER"
  | "SIMPLIFY_COOKING_TIME"
  | "KEEP_GOING";

export type NextAction = {
  type: NextActionType;
  title: string;
  detail: string;
};

export type InsightsInput = {
  breakdown: AdherenceResult;
  plan: {
    sessions: { dayIndex: number }[];
    days: { dayIndex: number; meals: unknown[] }[];
    mealsPerDay: number;
    cookingTime?: string;
  };
  trainingLogs: { occurredAt: Date | string; completed: boolean }[];
  nutritionLogs: { occurredAt: Date | string; followedPlan: boolean }[];
  weekStart: Date;
};

export type InsightsResult = {
  insights: Insight[];
  nextAction: NextAction;
  debug?: Record<string, unknown>;
};

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

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

function dayIndexFromDate(d: Date): number {
  const day = d.getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function getWeeklyAdherenceInsights(input: InsightsInput): InsightsResult {
  const { breakdown, plan, trainingLogs, nutritionLogs, weekStart } = input;
  const { start, end } = getWeekRange(weekStart);
  const insights: Insight[] = [];
  let nextAction: NextAction = {
    type: "KEEP_GOING",
    title: "Sigue así",
    detail: "Tu adherencia es buena. Mantén el ritmo.",
  };

  const trainingPercent = breakdown.training.percent;
  const nutritionPercent = breakdown.nutrition.percent;
  const totalPercent = breakdown.totalPercent;
  const plannedTraining = breakdown.training.planned;
  const plannedNutrition = breakdown.nutrition.planned;
  const mealsPerDay = plan.mealsPerDay ?? 3;
  const cookingTime = plan.cookingTime ?? "MIN_20";
  const sessions = plan.sessions ?? [];

  // Missed training days: planned dayIndex without completed log
  const completedTrainingSet = new Set<number>();
  for (const log of trainingLogs) {
    if (!log.completed || !inRange(log.occurredAt, start, end)) continue;
    completedTrainingSet.add(dayIndexFromDate(new Date(log.occurredAt)));
  }
  const missedTrainingDays = sessions
    .map((s) => s.dayIndex)
    .filter((di) => !completedTrainingSet.has(di));
  const missedTrainingNames =
    missedTrainingDays.length > 0
      ? missedTrainingDays
          .slice(0, 2)
          .map((di) => DAY_NAMES[di])
          .join(" y ")
      : null;

  // Missed meals days: days with 0 nutrition logs followedPlan=true
  const nutritionDayKeys = new Set<string>();
  for (const log of nutritionLogs) {
    if (!log.followedPlan || !inRange(log.occurredAt, start, end)) continue;
    const d = new Date(log.occurredAt);
    nutritionDayKeys.add(dayKey(d));
  }
  const missedMealsDays = 7 - nutritionDayKeys.size;

  // 3D) Keep going (highest priority)
  if (totalPercent >= 85) {
    nextAction = {
      type: "KEEP_GOING",
      title: "Sigue así",
      detail: "Tu adherencia es buena. Mantén el ritmo.",
    };
  } else if (trainingPercent < 50) {
    // 3A) Training low -> nextAction first
    if (sessions.length >= 4) {
      nextAction = {
        type: "REDUCE_DAYS_PER_WEEK",
        title: "Reduce días de entrenamiento",
        detail: "Prueba con menos días por semana para mantener la constancia.",
      };
    } else {
      nextAction = {
        type: "SCHEDULE_REMINDER",
        title: "Planifica recordatorios",
        detail: "Configura una alarma para no saltarte las sesiones.",
      };
    }
  } else if (nutritionPercent < 50) {
    // 3B) Nutrition low -> nextAction
    if (mealsPerDay >= 4) {
      nextAction = {
        type: "REDUCE_MEALS_PER_DAY",
        title: "Reduce comidas planificadas",
        detail: "Menos comidas por día puede ayudarte a seguir el plan.",
      };
    } else if (cookingTime !== "MIN_10" && cookingTime !== "MIN_20") {
      nextAction = {
        type: "SIMPLIFY_COOKING_TIME",
        title: "Simplifica el tiempo de cocina",
        detail: "Recetas más rápidas pueden aumentar tu adherencia.",
      };
    }
  }

  // 3C) Plan too ambitious
  if (plannedTraining >= 5 && trainingPercent < 60) {
    insights.push({
      type: "PLAN_TOO_AMBITIOUS",
      severity: "high",
      title: "Plan de entrenamiento muy exigente",
      detail: `${plannedTraining} sesiones puede ser demasiado. Considera reducir días.`,
    });
  }
  if (plannedNutrition >= 28 && nutritionPercent < 60) {
    insights.push({
      type: "PLAN_TOO_AMBITIOUS",
      severity: "high",
      title: "Plan nutricional muy exigente",
      detail: `${plannedNutrition} comidas planificadas. Considera simplificar.`,
    });
  }

  // 3A) Training
  if (trainingPercent < 50) {
    insights.push({
      type: "TRAINING_LOW_ADHERENCE",
      severity: "high",
      title: "Baja adherencia al entrenamiento",
      detail: `${breakdown.training.completed}/${breakdown.training.planned} sesiones completadas.`,
    });
    if (missedTrainingDays.length > 0 && missedTrainingNames) {
      insights.push({
        type: "MISSED_TRAINING_DAYS",
        severity: "medium",
        title: "Días sin entrenar",
        detail: `${missedTrainingDays.length} día(s) sin registrar: ${missedTrainingNames}.`,
      });
    }
  } else if (trainingPercent >= 50 && trainingPercent < 80) {
    insights.push({
      type: "TRAINING_LOW_ADHERENCE",
      severity: "medium",
      title: "Adherencia al entrenamiento mejorable",
      detail: `${breakdown.training.completed}/${breakdown.training.planned} sesiones.`,
    });
    if (missedTrainingDays.length > 0 && missedTrainingNames) {
      insights.push({
        type: "MISSED_TRAINING_DAYS",
        severity: "low",
        title: "Días sin entrenar",
        detail: `${missedTrainingDays.length} día(s): ${missedTrainingNames}.`,
      });
    }
  }

  // 3B) Nutrition
  if (nutritionPercent < 50) {
    insights.push({
      type: "NUTRITION_LOW_ADHERENCE",
      severity: "high",
      title: "Baja adherencia a la nutrición",
      detail: `${breakdown.nutrition.completed}/${breakdown.nutrition.planned} comidas registradas.`,
    });
    if (missedMealsDays > 0) {
      insights.push({
        type: "MISSED_MEALS_DAYS",
        severity: "medium",
        title: "Días sin comidas registradas",
        detail: `${missedMealsDays} día(s) sin ningún registro de comida según plan.`,
      });
    }
  } else if (nutritionPercent >= 50 && nutritionPercent < 80) {
    insights.push({
      type: "NUTRITION_LOW_ADHERENCE",
      severity: "medium",
      title: "Adherencia nutricional mejorable",
      detail: `${breakdown.nutrition.completed}/${breakdown.nutrition.planned} comidas.`,
    });
    if (missedMealsDays > 0) {
      insights.push({
        type: "MISSED_MEALS_DAYS",
        severity: "low",
        title: "Días sin comidas registradas",
        detail: `${missedMealsDays} día(s) sin registro.`,
      });
    }
  }

  // Sort by severity (high > medium > low), max 3
  const order = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => order[a.severity] - order[b.severity]);
  const trimmed = insights.slice(0, 3);

  return {
    insights: trimmed,
    nextAction,
    debug: { missedTrainingDays: missedTrainingDays.length, missedMealsDays },
  };
}
