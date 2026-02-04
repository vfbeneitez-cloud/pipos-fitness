/**
 * Alertas deterministas sobre series temporales de adherencia.
 * Input: items de /api/adherence/trend (ordenados desc por weekStart).
 */

export type TrendItem = {
  weekStart: string;
  totalPercent: number;
  trainingPercent: number;
  nutritionPercent: number;
};

export type AdherenceAlertType =
  | "LOW_ADHERENCE_STREAK"
  | "NUTRITION_DROP"
  | "PLAN_TOO_AMBITIOUS_TREND"
  | "IMPROVING_TREND";

export type AdherenceAlert = {
  type: AdherenceAlertType;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  weeks?: string[];
};

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
const MAX_ALERTS = 3;
const LOW_THRESHOLD = 60;
const NUTRITION_DROP_GAP = 20;
const IMPROVING_DELTA = 10;

export function getAdherenceAlerts(items: TrendItem[]): AdherenceAlert[] {
  if (items.length === 0) return [];

  const alerts: AdherenceAlert[] = [];

  const sorted = [...items].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  const latest = sorted[0];
  const prev = sorted[1];

  if (sorted.length >= 2) {
    const streakCount = countConsecutiveLow(sorted, LOW_THRESHOLD);
    if (streakCount >= 2) {
      const weeksInvolved = sorted
        .slice(0, streakCount)
        .map((i) => i.weekStart)
        .reverse();
      alerts.push({
        type: "LOW_ADHERENCE_STREAK",
        severity: "high",
        title:
          streakCount >= 3
            ? "Baja adherencia 3 semanas seguidas"
            : "Baja adherencia 2 semanas seguidas",
        detail:
          streakCount >= 3
            ? `${streakCount} semanas consecutivas por debajo del ${LOW_THRESHOLD}%.`
            : "Dos semanas seguidas por debajo del 60%.",
        weeks: weeksInvolved,
      });
    }
  }

  if (
    latest.nutritionPercent <= latest.trainingPercent - NUTRITION_DROP_GAP &&
    latest.nutritionPercent < LOW_THRESHOLD
  ) {
    alerts.push({
      type: "NUTRITION_DROP",
      severity: latest.nutritionPercent < 40 ? "high" : "medium",
      title: "Nutrición cae más que entrenamiento",
      detail: `Nutrición ${latest.nutritionPercent}% vs entrenamiento ${latest.trainingPercent}%. Prioriza las comidas planificadas.`,
      weeks: [latest.weekStart],
    });
  }

  const hasStreak = alerts.some((a) => a.type === "LOW_ADHERENCE_STREAK");
  if (
    !hasStreak &&
    sorted.length >= 2 &&
    latest.totalPercent < LOW_THRESHOLD &&
    prev &&
    prev.totalPercent < LOW_THRESHOLD
  ) {
    if (latest.trainingPercent < LOW_THRESHOLD && latest.nutritionPercent < LOW_THRESHOLD) {
      alerts.push({
        type: "PLAN_TOO_AMBITIOUS_TREND",
        severity: "medium",
        title: "Plan probablemente demasiado ambicioso",
        detail:
          "Entrenamiento y nutrición bajos 2 semanas. Considera reducir carga sin cambiar el plan.",
        weeks: [latest.weekStart, prev.weekStart],
      });
    }
  }

  if (prev && latest.totalPercent >= prev.totalPercent + IMPROVING_DELTA) {
    alerts.push({
      type: "IMPROVING_TREND",
      severity: "low",
      title: "Tendencia positiva",
      detail: `+${latest.totalPercent - prev.totalPercent} puntos vs semana anterior. Sigue así.`,
      weeks: [latest.weekStart, prev.weekStart],
    });
  }

  alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return alerts.slice(0, MAX_ALERTS);
}

function countConsecutiveLow(items: TrendItem[], threshold: number): number {
  let count = 0;
  for (const item of items) {
    if (item.totalPercent < threshold) count++;
    else break;
  }
  return count;
}
