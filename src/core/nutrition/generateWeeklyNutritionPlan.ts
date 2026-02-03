export type CookingTime = "MIN_10" | "MIN_20" | "MIN_40" | "FLEXIBLE";

export type Meal = {
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  minutes: number;
  tags: string[]; // e.g. ["high-protein", "vegetarian"]
  ingredients: string[];
  instructions: string;
  substitutions: Array<{ title: string; minutes: number }>;
};

export type NutritionDay = {
  dayIndex: number; // 0..6
  meals: Meal[];
};

export type WeeklyNutritionPlan = {
  mealsPerDay: number;
  cookingTime: CookingTime;
  dietaryStyle?: string | null;
  allergies?: string | null;
  dislikes?: string | null;
  days: NutritionDay[];
};

const SLOT_SETS: Record<number, Meal["slot"][]> = {
  2: ["lunch", "dinner"],
  3: ["breakfast", "lunch", "dinner"],
  4: ["breakfast", "lunch", "dinner", "snack"],
};

type Recipe = Omit<Meal, "slot">;

const RECIPES: Recipe[] = [
  {
    title: "Overnight oats (yogur + avena + fruta)",
    minutes: 10,
    tags: ["quick", "vegetarian"],
    ingredients: ["avena", "yogur", "fruta", "miel (opcional)"],
    instructions: "Mezcla todo en un bol/tupper, deja en nevera. Ajusta fruta y textura.",
    substitutions: [{ title: "Tostadas + queso fresco + fruta", minutes: 10 }],
  },
  {
    title: "Tortilla francesa + ensalada",
    minutes: 15,
    tags: ["quick", "high-protein"],
    ingredients: ["huevos", "ensalada", "aceite de oliva", "sal"],
    instructions: "Haz la tortilla en sartén. Acompaña con ensalada básica.",
    substitutions: [{ title: "Revuelto de huevos con verduras congeladas", minutes: 15 }],
  },
  {
    title: "Pollo a la plancha + arroz + verduras",
    minutes: 30,
    tags: ["balanced", "high-protein"],
    ingredients: ["pollo", "arroz", "verduras (fresh/frozen)", "aceite", "sal"],
    instructions: "Cocina arroz. Plancha pollo. Saltea/hierva verduras. Monta el plato.",
    substitutions: [{ title: "Atún + arroz + ensalada", minutes: 15 }],
  },
  {
    title: "Bowl de legumbres (garbanzos + verduras + aceite)",
    minutes: 15,
    tags: ["quick", "vegetarian", "high-fiber"],
    ingredients: ["garbanzos cocidos", "verduras", "aceite de oliva", "sal", "limón"],
    instructions: "Mezcla garbanzos con verduras. Aliña con aceite/limón/sal.",
    substitutions: [{ title: "Ensalada de lentejas (cocidas) + atún opcional", minutes: 15 }],
  },
  {
    title: "Salmón (o pescado) + patata + verduras",
    minutes: 40,
    tags: ["balanced"],
    ingredients: ["pescado", "patata", "verduras", "sal", "aceite"],
    instructions: "Hornea patata y pescado. Acompaña con verduras. Ajusta porciones.",
    substitutions: [{ title: "Pavo + patata micro + verduras", minutes: 20 }],
  },
  {
    title: "Yogur + frutos secos",
    minutes: 5,
    tags: ["snack", "quick"],
    ingredients: ["yogur", "frutos secos"],
    instructions: "Sirve yogur y añade frutos secos.",
    substitutions: [{ title: "Fruta + queso fresco", minutes: 5 }],
  },
];

function cookingTimeLimit(ct: CookingTime): number {
  switch (ct) {
    case "MIN_10":
      return 10;
    case "MIN_20":
      return 20;
    case "MIN_40":
      return 40;
    case "FLEXIBLE":
      return 999;
  }
}

function normalizeText(s?: string | null): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function filterRecipes(args: {
  cookingTime: CookingTime;
  dietaryStyle?: string | null;
  allergies?: string | null;
  dislikes?: string | null;
}): Recipe[] {
  const limit = cookingTimeLimit(args.cookingTime);
  const dislikes = normalizeText(args.dislikes);
  const allergies = normalizeText(args.allergies);

  // v0: filtro por tiempo + excluir si ingredientes contienen palabras de dislikes/alergias (simple)
  return RECIPES.filter((r) => {
    if (r.minutes > limit) return false;
    const ing = r.ingredients.join(" ").toLowerCase();
    if (dislikes.some((d) => ing.includes(d))) return false;
    if (allergies.some((a) => ing.includes(a))) return false;
    // dietaryStyle v0: si incluye "veget" exigir tag vegetarian
    const ds = (args.dietaryStyle ?? "").toLowerCase();
    if (ds.includes("veget") && !r.tags.includes("vegetarian")) return false;
    return true;
  });
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeMeal(slot: Meal["slot"], recipe: Recipe): Meal {
  return { slot, ...recipe };
}

export function generateWeeklyNutritionPlan(args: {
  mealsPerDay: number;
  cookingTime: CookingTime;
  dietaryStyle?: string | null;
  allergies?: string | null;
  dislikes?: string | null;
}): WeeklyNutritionPlan {
  const mealsPerDay = Math.min(4, Math.max(args.mealsPerDay, 2));
  const slots = SLOT_SETS[mealsPerDay] ?? SLOT_SETS[3];

  const pool = filterRecipes(args);
  // fallback: si el filtro deja vacío, usa todo
  const safePool = pool.length ? pool : RECIPES;

  const days: NutritionDay[] = Array.from({ length: 7 }).map((_, dayIndex) => {
    const usedTitles = new Set<string>();
    const meals = slots.map((slot) => {
      const available = safePool.filter((r) => !usedTitles.has(r.title));
      const poolForPick = available.length > 0 ? available : safePool;
      const recipe = pick(poolForPick);
      usedTitles.add(recipe.title);
      return makeMeal(slot, recipe);
    });
    return { dayIndex, meals };
  });

  return {
    mealsPerDay,
    cookingTime: args.cookingTime,
    dietaryStyle: args.dietaryStyle ?? null,
    allergies: args.allergies ?? null,
    dislikes: args.dislikes ?? null,
    days,
  };
}

/** No repetir plato (title) dentro del mismo día. Repara IA o cualquier fuente. */
export function repairDuplicateTitlesInPlan(plan: WeeklyNutritionPlan): WeeklyNutritionPlan {
  const pool = filterRecipes({
    cookingTime: plan.cookingTime,
    dietaryStyle: plan.dietaryStyle,
    allergies: plan.allergies,
    dislikes: plan.dislikes,
  });
  const safePool = pool.length ? pool : RECIPES;

  const days: NutritionDay[] = plan.days.map((day) => {
    const usedTitles = new Set<string>();
    const meals = day.meals.map((meal) => {
      if (usedTitles.has(meal.title)) {
        const available = safePool.filter((r) => !usedTitles.has(r.title));
        const poolForPick = available.length > 0 ? available : safePool;
        const recipe = pick(poolForPick);
        usedTitles.add(recipe.title);
        return makeMeal(meal.slot, recipe);
      }
      usedTitles.add(meal.title);
      return meal;
    });
    return { dayIndex: day.dayIndex, meals };
  });

  return { ...plan, days };
}
