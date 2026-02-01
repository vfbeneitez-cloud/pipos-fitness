import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";
import {
  generateWeeklyNutritionPlan,
  type Meal,
} from "@/src/core/nutrition/generateWeeklyNutritionPlan";
const DEFAULT_COOKING_TIME = "MIN_20" as const;

const SwapBodyPrimary = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayIndex: z.number().int().min(0).max(6),
  mealIndex: z.number().int().min(0),
  reason: z.enum(["dislike", "noTime", "noIngredients", "other"]).optional(),
});

const SwapBodyLegacy = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayIndex: z.number().int().min(0).max(6),
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  reason: z.enum(["dislike", "noTime", "noIngredients", "other"]).optional(),
});

function normalizeWeekStart(weekStart: string): Date {
  return new Date(`${weekStart}T00:00:00.000Z`);
}

export async function swapMeal(body: unknown, userId: string) {
  const primaryParsed = SwapBodyPrimary.safeParse(body);
  const legacyParsed = SwapBodyLegacy.safeParse(body);

  let weekStart: string;
  let dayIndex: number;
  let mealIndex: number | null = null;
  let slotFromLegacy: string | null = null;

  if (primaryParsed.success) {
    ({ weekStart, dayIndex, mealIndex } = primaryParsed.data);
  } else if (legacyParsed.success) {
    const legacy = legacyParsed.data;
    weekStart = legacy.weekStart;
    dayIndex = legacy.dayIndex;
    slotFromLegacy = legacy.slot ?? legacy.mealSlot ?? null;
    if (!slotFromLegacy) {
      return { status: 400, body: { error: "INVALID_BODY" } };
    }
  } else {
    return {
      status: 400,
      body: { error: "INVALID_BODY", details: primaryParsed.error?.flatten?.() },
    };
  }

  const weekStartDate = normalizeWeekStart(weekStart);

  const plan = await prisma.weeklyPlan.findUnique({
    where: { userId_weekStart: { userId, weekStart: weekStartDate } },
  });

  if (!plan) {
    return { status: 404, body: { error: "PLAN_NOT_FOUND" } };
  }

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const nutritionPlan = plan.nutritionJson as {
    days: Array<{ dayIndex: number; meals: Meal[] }>;
  };

  const day = nutritionPlan.days.find((d) => d.dayIndex === dayIndex);
  if (!day) {
    return { status: 400, body: { error: "INVALID_DAY_INDEX" } };
  }

  if (mealIndex === null && slotFromLegacy) {
    const indices = day.meals
      .map((m, i) => (m.slot === slotFromLegacy ? i : -1))
      .filter((i) => i >= 0);
    if (indices.length === 0) {
      return { status: 400, body: { error: "INVALID_INPUT" } };
    }
    if (indices.length > 1) {
      return {
        status: 400,
        body: {
          error: "INVALID_INPUT",
          message:
            "Hay varias comidas de ese tipo en el día. Especifica cuál quieres cambiar.",
        },
      };
    }
    mealIndex = indices[0];
  } else if (mealIndex !== null) {
    if (mealIndex >= day.meals.length) {
      return { status: 400, body: { error: "INVALID_INPUT" } };
    }
  } else {
    return { status: 400, body: { error: "INVALID_BODY" } };
  }

  const newPlan = generateWeeklyNutritionPlan({
    mealsPerDay: profile?.mealsPerDay ?? 3,
    cookingTime: profile?.cookingTime ?? DEFAULT_COOKING_TIME,
    dietaryStyle: profile?.dietaryStyle ?? null,
    allergies: profile?.allergies ?? null,
    dislikes: profile?.dislikes ?? null,
  });

  const targetSlot = day.meals[mealIndex].slot;
  const newDayMeals = newPlan.days[0]?.meals ?? [];
  const alternativeMeal =
    newDayMeals.find((m) => m.slot === targetSlot) ?? newDayMeals[0];

  if (!alternativeMeal) {
    return { status: 500, body: { error: "NO_ALTERNATIVE_AVAILABLE" } };
  }

  return { status: 200, body: { meal: alternativeMeal } };
}
