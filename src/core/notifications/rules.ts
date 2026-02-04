/**
 * Reglas deterministas para generar candidatos de notificación diaria.
 */

export type NotificationType = "WEEK_BEHIND_GOAL" | "STREAK_BROKEN" | "TODAY_TRAINING_REMINDER";

export type NotificationCandidate = {
  type: NotificationType;
  scopeKey: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

export type BuildDailyInput = {
  today: Date;
  weekStart: string;
  goalPercent: number;
  nudge: { type: string; severity?: string };
  currentWeekPercent: number | null;
  todayPlannedSessionExists: boolean;
  todayTrainingCompleted: boolean;
};

const PRIORITY: Record<NotificationType, number> = {
  STREAK_BROKEN: 0,
  TODAY_TRAINING_REMINDER: 1,
  WEEK_BEHIND_GOAL: 2,
};

const MAX_PER_DAY = 2;

export function buildDailyNotificationCandidates(input: BuildDailyInput): NotificationCandidate[] {
  const candidates: NotificationCandidate[] = [];

  if (
    input.nudge.type === "BEHIND_GOAL" &&
    input.currentWeekPercent != null &&
    input.currentWeekPercent < input.goalPercent
  ) {
    candidates.push({
      type: "WEEK_BEHIND_GOAL",
      scopeKey: `week:${input.weekStart}`,
      title: "Semana por debajo del objetivo",
      message: `Tu adherencia esta semana está por debajo del ${input.goalPercent}% objetivo.`,
      data: { weekStart: input.weekStart, goalPercent: input.goalPercent },
    });
  }

  if (input.nudge.type === "STREAK_BROKEN") {
    candidates.push({
      type: "STREAK_BROKEN",
      scopeKey: `week:${input.weekStart}`,
      title: "Racha rota",
      message: "Esta semana no alcanzaste el objetivo. Revisa qué te impidió seguir el plan.",
      data: { weekStart: input.weekStart },
    });
  }

  if (input.todayPlannedSessionExists && !input.todayTrainingCompleted) {
    const dayStr = input.today.toISOString().slice(0, 10);
    candidates.push({
      type: "TODAY_TRAINING_REMINDER",
      scopeKey: `day:${dayStr}`,
      title: "Sesión de hoy pendiente",
      message: "Hay una sesión planificada para hoy que aún no has registrado.",
      data: { day: dayStr },
    });
  }

  candidates.sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type]);
  return candidates.slice(0, MAX_PER_DAY);
}
