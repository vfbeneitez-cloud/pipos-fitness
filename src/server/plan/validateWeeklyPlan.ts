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

export function validateNutritionBeforePersist(nutrition: {
  mealsPerDay: number;
  cookingTime: string;
  days: NutritionDay[];
}): { ok: true } | { ok: false; reason: string } {
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

  return { ok: true };
}
