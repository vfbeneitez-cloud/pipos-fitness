import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";
import {
  generateWeeklyNutritionPlan,
  type Meal,
} from "@/src/core/nutrition/generateWeeklyNutritionPlan";
import { CookingTime } from "@prisma/client";

const SwapBody = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayIndex: z.number().int().min(0).max(6),
  mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  reason: z.enum(["dislike", "noTime", "noIngredients", "other"]).optional(),
});

function normalizeWeekStart(weekStart: string): Date {
  return new Date(`${weekStart}T00:00:00.000Z`);
}

export async function swapMeal(body: unknown, userId: string) {
  const parsed = SwapBody.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_BODY", details: parsed.error.flatten() } };
  }

  const { weekStart, dayIndex, mealSlot } = parsed.data;
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

  const newPlan = generateWeeklyNutritionPlan({
    mealsPerDay: profile?.mealsPerDay ?? 3,
    cookingTime: profile?.cookingTime ?? CookingTime.MIN_20,
    dietaryStyle: profile?.dietaryStyle ?? null,
    allergies: profile?.allergies ?? null,
    dislikes: profile?.dislikes ?? null,
  });

  const alternativeMeal =
    newPlan.days[0]?.meals.find((m) => m.slot === mealSlot) ?? newPlan.days[0]?.meals[0];

  if (!alternativeMeal) {
    return { status: 500, body: { error: "NO_ALTERNATIVE_AVAILABLE" } };
  }

  return { status: 200, body: { meal: alternativeMeal } };
}
