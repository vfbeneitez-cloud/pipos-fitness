/**
 * Parse AI adjustment response and apply fallback rules.
 * Used by adjustWeeklyPlan. Logic unchanged; extract only.
 */
import * as Sentry from "@sentry/nextjs";
import type { RedFlag } from "../prompts/adjustPlan";

export type Adjustments = {
  daysPerWeek?: number | null;
  sessionMinutes?: number | null;
  environment?: string | null;
  mealsPerDay?: number | null;
  cookingTime?: string | null;
};

export type AdjustPlanProfile = {
  daysPerWeek?: number | null;
  sessionMinutes?: number | null;
  mealsPerDay?: number | null;
  cookingTime?: string | null;
  environment?: string | null;
};

export type ParseResult = {
  rationale: string;
  adjustments: Adjustments;
  fallbackType: "red_flag" | "parse_error" | "provider_error" | "none";
};

export function parseAdjustmentResponse(args: {
  content: string;
  redFlag: RedFlag;
  adherence: { training: number; nutrition: number };
  profile: AdjustPlanProfile | null;
}): ParseResult {
  const { content, redFlag, adherence, profile } = args;
  let adjustmentApplied = false;
  let rationale = "";
  let fallbackType: ParseResult["fallbackType"] = "none";
  let adjustments: Adjustments = {};

  if (redFlag.detected) {
    fallbackType = "red_flag";
    Sentry.captureMessage("weekly_plan_fallback_red_flag", {
      tags: { fallback_type: "red_flag" },
      extra: { trainingScore: adherence.training, nutritionScore: adherence.nutrition },
    });
    rationale = `${redFlag.message} He aplicado ajustes conservadores al plan.`;
    adjustments = {
      daysPerWeek: Math.max(1, (profile?.daysPerWeek ?? 3) - 1),
      sessionMinutes: Math.max(15, (profile?.sessionMinutes ?? 45) - 15),
      mealsPerDay: profile?.mealsPerDay ?? 3,
      cookingTime: profile?.cookingTime ?? "MIN_20",
    };
    adjustmentApplied = true;
  } else {
    try {
      const parsed = JSON.parse(content) as { rationale?: string; adjustments?: Adjustments };
      rationale = parsed.rationale ?? "Ajustes aplicados según adherencia y perfil.";
      const raw = parsed.adjustments ?? {};
      const hasTraining =
        raw.daysPerWeek != null || raw.sessionMinutes != null || raw.environment != null;
      if (hasTraining && !adjustmentApplied) {
        adjustments = {
          daysPerWeek: raw.daysPerWeek ?? undefined,
          sessionMinutes: raw.sessionMinutes ?? undefined,
          environment: raw.environment ?? undefined,
        };
        adjustmentApplied = true;
      } else if (!adjustmentApplied) {
        const hasNutrition = raw.mealsPerDay != null || raw.cookingTime != null;
        if (hasNutrition) {
          adjustments = {
            mealsPerDay: raw.mealsPerDay ?? undefined,
            cookingTime: raw.cookingTime ?? undefined,
          };
          adjustmentApplied = true;
        }
      }
    } catch {
      fallbackType = "parse_error";
      Sentry.captureMessage("weekly_plan_fallback_parse_error", {
        tags: { fallback_type: "parse_error" },
        extra: { trainingScore: adherence.training, nutritionScore: adherence.nutrition },
      });
      rationale =
        adherence.training < 0.5 || adherence.nutrition < 0.5
          ? "He reducido la complejidad del plan para que sea más fácil de seguir esta semana."
          : "He aplicado ajustes menores basados en tu progreso.";
      if (!adjustmentApplied && adherence.training < 0.5) {
        adjustments.daysPerWeek = Math.max(1, (profile?.daysPerWeek ?? 3) - 1);
        adjustmentApplied = true;
      }
      if (!adjustmentApplied && adherence.nutrition < 0.5) {
        adjustments.mealsPerDay = Math.max(2, (profile?.mealsPerDay ?? 3) - 1);
        adjustments.cookingTime = "MIN_10";
        adjustmentApplied = true;
      }
    }
  }

  return { rationale, adjustments, fallbackType };
}

export function applyAdjustmentsToFinalParams(args: {
  adjustments: Adjustments;
  profile: AdjustPlanProfile | null;
}): {
  finalDaysPerWeek: number;
  finalSessionMinutes: number;
  finalEnvironment: "GYM" | "HOME" | "CALISTHENICS" | "POOL" | "MIXED" | "ESTIRAMIENTOS";
  finalMealsPerDay: number;
  finalCookingTime: "MIN_10" | "MIN_20" | "MIN_40" | "FLEXIBLE";
} {
  const { adjustments, profile } = args;
  const finalDaysPerWeek = adjustments.daysPerWeek ?? profile?.daysPerWeek ?? 3;
  const finalSessionMinutes = adjustments.sessionMinutes ?? profile?.sessionMinutes ?? 45;
  const finalEnvironment =
    (adjustments.environment as
      | "GYM"
      | "HOME"
      | "CALISTHENICS"
      | "POOL"
      | "MIXED"
      | "ESTIRAMIENTOS"
      | undefined) ??
    (profile?.environment as
      | "GYM"
      | "HOME"
      | "CALISTHENICS"
      | "POOL"
      | "MIXED"
      | "ESTIRAMIENTOS") ??
    "GYM";
  const finalMealsPerDay = adjustments.mealsPerDay ?? profile?.mealsPerDay ?? 3;
  const finalCookingTime =
    (adjustments.cookingTime as "MIN_10" | "MIN_20" | "MIN_40" | "FLEXIBLE" | undefined) ??
    (profile?.cookingTime as "MIN_10" | "MIN_20" | "MIN_40" | "FLEXIBLE") ??
    "MIN_20";
  return {
    finalDaysPerWeek,
    finalSessionMinutes,
    finalEnvironment,
    finalMealsPerDay,
    finalCookingTime,
  };
}
