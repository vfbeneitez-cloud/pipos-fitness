import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";
import type { Prisma } from "@prisma/client";
import { TrainingEnvironment } from "@prisma/client";
import {
  generateWeeklyTrainingPlan,
  type WeeklyTrainingPlan,
} from "@/src/core/training/generateWeeklyTrainingPlan";
import { generateWeeklyNutritionPlan } from "@/src/core/nutrition/generateWeeklyNutritionPlan";
import {
  validateNutritionBeforePersist,
  validateTrainingBeforePersist,
} from "@/src/server/plan/validateWeeklyPlan";
import { trackAiPlanAudit } from "@/src/server/ai/aiAudit";
import { trackEvent } from "@/src/server/lib/events";
import { badRequestBody } from "@/src/server/api/errorResponse";

const GetQuery = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const TrainingEnvironmentSchema = z.enum([
  "GYM",
  "HOME",
  "CALISTHENICS",
  "POOL",
  "MIXED",
  "ESTIRAMIENTOS",
]);

const PostBody = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  environment: TrainingEnvironmentSchema,
  daysPerWeek: z.number().int().min(1).max(7),
  sessionMinutes: z.number().int().min(15).max(180),
});

function normalizeWeekStart(weekStart: string): Date {
  // treat provided date as UTC midnight (v0)
  return new Date(`${weekStart}T00:00:00.000Z`);
}

export async function getWeeklyPlan(url: string, userId: string) {
  const u = new URL(url);
  const parsed = GetQuery.safeParse({
    weekStart: u.searchParams.get("weekStart") ?? "",
  });
  if (!parsed.success) return { status: 400, body: { error: "INVALID_QUERY" } };

  const weekStart = normalizeWeekStart(parsed.data.weekStart);

  const plan = await prisma.weeklyPlan.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });

  return { status: 200, body: plan };
}

export async function createWeeklyPlan(body: unknown, userId: string) {
  const t0 = Date.now();
  const providerName = "mock";

  const parsed = PostBody.safeParse(body);
  if (!parsed.success)
    return { status: 400, body: { error: "INVALID_BODY", details: parsed.error.flatten() } };

  const { environment, daysPerWeek, sessionMinutes } = parsed.data;
  const weekStart = normalizeWeekStart(parsed.data.weekStart);

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const rawMealsPerDay = profile?.mealsPerDay ?? 3;
  const finalMealsPerDay = Math.min(4, Math.max(2, rawMealsPerDay));
  const finalCookingTime = profile?.cookingTime ?? "MIN_20";

  const exercisePool = await prisma.exercise.findMany({
    where: environment === "MIXED" ? {} : { environment: environment as TrainingEnvironment },
    select: { slug: true, name: true },
  });
  if (exercisePool.length === 0) {
    trackAiPlanAudit(
      { kind: "fallback", fallbackType: "no_exercises_available" },
      {
        context: "createWeeklyPlan",
        provider: providerName,
        environment,
        daysPerWeek,
        sessionMinutes,
        mealsPerDay: finalMealsPerDay,
        cookingTime: finalCookingTime,
        poolSize: 0,
        durationMs: Date.now() - t0,
      },
    );
    return {
      status: 409,
      body: {
        error: "NO_EXERCISES_AVAILABLE",
        message:
          "Aún no tenemos ejercicios suficientes para crear tu plan. Inténtalo de nuevo más tarde.",
      },
    };
  }
  let training = generateWeeklyTrainingPlan({
    environment,
    daysPerWeek,
    sessionMinutes,
    exercisePool,
  });
  let nutrition = generateWeeklyNutritionPlan({
    mealsPerDay: finalMealsPerDay,
    cookingTime: finalCookingTime,
    dietaryStyle: profile?.dietaryStyle ?? null,
    allergies: profile?.allergies ?? null,
    dislikes: profile?.dislikes ?? null,
  });
  trackAiPlanAudit(
    { kind: "success" },
    {
      context: "createWeeklyPlan",
      provider: providerName,
      environment,
      daysPerWeek,
      sessionMinutes,
      mealsPerDay: finalMealsPerDay,
      cookingTime: finalCookingTime,
      poolSize: exercisePool.length,
      durationMs: Date.now() - t0,
    },
  );

  const vt = validateTrainingBeforePersist(training);
  if (!vt.ok) {
    return { status: 400, body: badRequestBody("INVALID_TRAINING_PLAN") };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let v = validateNutritionBeforePersist(nutrition as any);
  if (!v.ok) {
    trackEvent(
      "weekly_plan_invalid_before_persist",
      { reason: v.reason, context: "createWeeklyPlan" },
      { sentry: true },
    );
    nutrition = generateWeeklyNutritionPlan({
      mealsPerDay: finalMealsPerDay,
      cookingTime: finalCookingTime,
      dietaryStyle: profile?.dietaryStyle ?? null,
      allergies: profile?.allergies ?? null,
      dislikes: profile?.dislikes ?? null,
    });
    v = validateNutritionBeforePersist(nutrition as any);
  }

  const trainingForJson = vt.normalized;
  const nutritionForJson = v.ok ? v.normalized : nutrition;

  const plan = await prisma.weeklyPlan.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: {
      trainingJson: trainingForJson as unknown as Prisma.InputJsonValue,
      nutritionJson: nutritionForJson as unknown as Prisma.InputJsonValue,
      status: "DRAFT",
    },
    create: {
      userId,
      weekStart,
      status: "DRAFT",
      trainingJson: trainingForJson as unknown as Prisma.InputJsonValue,
      nutritionJson: nutritionForJson as unknown as Prisma.InputJsonValue,
    },
  });

  return { status: 200, body: plan };
}
