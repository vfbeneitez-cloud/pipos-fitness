import { z } from "zod";
import { TRAINING_SCHEMA_VERSION } from "@/src/core/training/generateWeeklyTrainingPlan";
import { NUTRITION_SCHEMA_VERSION } from "@/src/core/nutrition/generateWeeklyNutritionPlan";

type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

type Meal = {
  slot: MealSlot;
  title: string;
  minutes: number;
  tags: string[];
  ingredients: string[];
  instructions: string;
  substitutions: Array<{ title: string; minutes: number }>;
};

type NutritionDay = { dayIndex: number; meals: Meal[] };

function isPlaceholderTitle(raw: string): boolean {
  const t = raw.toLowerCase().trim();
  if (!t) return true;
  if (t === "b" || t === "l" || t === "d" || t === "s1" || t === "s2") return true;
  if (t.includes("...") || t.includes("placeholder") || t.includes("lorem")) return true;
  return raw.trim().length < 8;
}

export const SUPPORTED_NUTRITION_SCHEMA_VERSION = NUTRITION_SCHEMA_VERSION;
export const SUPPORTED_TRAINING_SCHEMA_VERSION = TRAINING_SCHEMA_VERSION;

const TrainingExerciseZ = z
  .object({
    slug: z.string().min(1),
    sets: z.number().int().min(1),
  })
  .passthrough();

const TrainingSessionZ = z
  .object({
    dayIndex: z.number().int().min(0).max(6),
    name: z.string().min(1),
    exercises: z.array(TrainingExerciseZ).min(1),
  })
  .passthrough();

const TrainingPersistZ = z
  .object({
    schemaVersion: z.number().int().optional(),
    sessions: z.array(TrainingSessionZ).min(1),
  })
  .passthrough();

export type TrainingNormalized = z.infer<typeof TrainingPersistZ> & {
  schemaVersion: number;
};

export function validateTrainingBeforePersist(
  training: unknown,
):
  | { ok: true; normalized: TrainingNormalized }
  | { ok: false; reason: "invalid_shape" | "unsupported_schema_version" } {
  const parsed = TrainingPersistZ.safeParse(training);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_shape" };
  }

  const sv = parsed.data.schemaVersion;
  if (sv !== undefined && sv !== SUPPORTED_TRAINING_SCHEMA_VERSION) {
    return { ok: false, reason: "unsupported_schema_version" };
  }

  return {
    ok: true,
    normalized: {
      ...parsed.data,
      schemaVersion: SUPPORTED_TRAINING_SCHEMA_VERSION,
    },
  };
}

export type NutritionNormalized = {
  schemaVersion: number;
  mealsPerDay: number;
  cookingTime: string;
  days: NutritionDay[];
  [key: string]: unknown;
};

export function validateNutritionBeforePersist(nutrition: {
  schemaVersion?: number;
  mealsPerDay: number;
  cookingTime: string;
  days: NutritionDay[];
}): { ok: true; normalized: NutritionNormalized } | { ok: false; reason: string } {
  // schemaVersion: if present must be supported; if missing treat as legacy (compat)
  if (nutrition.schemaVersion !== undefined) {
    if (
      !Number.isInteger(nutrition.schemaVersion) ||
      nutrition.schemaVersion !== SUPPORTED_NUTRITION_SCHEMA_VERSION
    ) {
      return { ok: false, reason: "unsupported_schema_version" };
    }
  }

  if (
    !Number.isInteger(nutrition.mealsPerDay) ||
    nutrition.mealsPerDay < 2 ||
    nutrition.mealsPerDay > 4
  ) {
    return { ok: false, reason: "nutrition_mealsPerDay_out_of_range" };
  }
  if (!Array.isArray(nutrition.days) || nutrition.days.length !== 7) {
    return { ok: false, reason: "nutrition_days_invalid" };
  }

  for (const d of nutrition.days) {
    if (!Number.isInteger(d.dayIndex) || d.dayIndex < 0 || d.dayIndex > 6) {
      return { ok: false, reason: "nutrition_dayIndex_invalid" };
    }
    if (!Array.isArray(d.meals) || d.meals.length !== nutrition.mealsPerDay) {
      return { ok: false, reason: "nutrition_meals_length_mismatch" };
    }

    const slots = new Set<string>();
    for (const m of d.meals) {
      if (slots.has(m.slot)) return { ok: false, reason: "nutrition_duplicate_slot_same_day" };
      slots.add(m.slot);

      if (isPlaceholderTitle(m.title)) return { ok: false, reason: "nutrition_title_placeholder" };
      if (!Number.isFinite(m.minutes) || m.minutes <= 0)
        return { ok: false, reason: "nutrition_minutes_invalid" };

      if (!Array.isArray(m.ingredients) || m.ingredients.length < 2) {
        return { ok: false, reason: "nutrition_ingredients_too_few" };
      }
      const instr = (m.instructions ?? "").trim();
      if (instr.length < 20) return { ok: false, reason: "nutrition_instructions_too_short" };
    }
  }

  return {
    ok: true,
    normalized: {
      ...nutrition,
      schemaVersion: SUPPORTED_NUTRITION_SCHEMA_VERSION,
    } as NutritionNormalized,
  };
}
