/**
 * Prompts for AI adjust-plan (rationale + adjustments).
 * Used by adjustWeeklyPlan. Do not rewrite rules; extract only.
 */

export type AdjustPlanProfile = {
  level?: string | null;
  daysPerWeek?: number | null;
  sessionMinutes?: number | null;
  environment?: string | null;
  mealsPerDay?: number | null;
  cookingTime?: string | null;
};

export type RedFlag = {
  detected: boolean;
  message?: string;
};

export function getAdjustSystemPrompt(): string {
  return `Eres un asistente de entrenamiento y nutrición. Analiza el perfil del usuario y sus logs recientes para proponer ajustes seguros al plan semanal.

Reglas:
- NO hagas diagnóstico médico.
- Si detectas red flags (dolor agudo, mareos, síntomas serios), recomienda consultar profesional sanitario y propón ajustes conservadores.
- No sugieras dietas extremas ni volúmenes peligrosos.
- Si la adherencia es baja, reduce complejidad gradualmente.
- Mantén un tono prudente y sin promesas de resultados garantizados.

Responde SOLO con un JSON válido:
{
  "rationale": "explicación breve sin PII ni diagnóstico médico",
  "adjustments": {
    "daysPerWeek": número (1-7) o null si mantener,
    "sessionMinutes": número (15-180) o null si mantener,
    "environment": "GYM|HOME|CALISTHENICS|POOL|MIXED" o null si mantener,
    "mealsPerDay": número (2-4) o null si mantener,
    "cookingTime": "MIN_10|MIN_20|MIN_40|FLEXIBLE" o null si mantener
  }
}`;
}

export function getAdjustUserPrompt(args: {
  profile: AdjustPlanProfile | null;
  trainingCompleted: number;
  trainingTotal: number;
  nutritionFollowed: number;
  nutritionTotal: number;
  redFlag: RedFlag;
  currentPlanExists: boolean;
}): string {
  const {
    profile,
    trainingCompleted,
    trainingTotal,
    nutritionFollowed,
    nutritionTotal,
    redFlag,
    currentPlanExists,
  } = args;
  return `Perfil:
- Nivel: ${profile?.level ?? "BEGINNER"}
- Días/semana actuales: ${profile?.daysPerWeek ?? 3}
- Minutos/sesión: ${profile?.sessionMinutes ?? 45}
- Entorno: ${profile?.environment ?? "GYM"}
- Comidas/día: ${profile?.mealsPerDay ?? 3}
- Tiempo cocina: ${profile?.cookingTime ?? "MIN_20"}

Logs últimos 7 días:
- Sesiones completadas: ${trainingCompleted}/${trainingTotal}
- Comidas según plan: ${nutritionFollowed}/${nutritionTotal}
${redFlag.detected ? `- RED FLAG: ${redFlag.message}` : ""}

Plan actual: ${currentPlanExists ? "existe" : "no existe"}

Propón ajustes seguros basados en adherencia y perfil.`;
}
