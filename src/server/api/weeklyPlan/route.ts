import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";
import type { Prisma } from "@prisma/client";
import { generateWeeklyTrainingPlan } from "@/src/core/training/generateWeeklyTrainingPlan";
import { generateWeeklyNutritionPlan } from "@/src/core/nutrition/generateWeeklyNutritionPlan";
import { getProvider } from "@/src/server/ai/getProvider";
import { generatePlanFromApi, mapAiTrainingToExistingExercises } from "@/src/server/ai/agentWeeklyPlan";
import { trackEvent } from "@/src/server/lib/events";

const GetQuery = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const TrainingEnvironmentSchema = z.enum(["GYM", "HOME", "CALISTHENICS", "POOL", "MIXED"]);

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
  const parsed = PostBody.safeParse(body);
  if (!parsed.success)
    return { status: 400, body: { error: "INVALID_BODY", details: parsed.error.flatten() } };

  const { environment, daysPerWeek, sessionMinutes } = parsed.data;
  const weekStart = normalizeWeekStart(parsed.data.weekStart);

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const finalMealsPerDay = profile?.mealsPerDay ?? 3;
  const finalCookingTime = profile?.cookingTime ?? "MIN_20";

  let training: ReturnType<typeof generateWeeklyTrainingPlan>;
  let nutrition: ReturnType<typeof generateWeeklyNutritionPlan>;

  if (process.env.OPENAI_API_KEY) {
    const provider = getProvider();
    const planResult = await generatePlanFromApi(provider, {
      profile,
      finalEnvironment: environment,
      finalDaysPerWeek: daysPerWeek,
      finalSessionMinutes: sessionMinutes,
      finalMealsPerDay,
      finalCookingTime,
    });
    if (planResult) {
      const exercisePool = await prisma.exercise.findMany({
        where: { ...(environment === "MIXED" ? {} : { environment }) },
        select: { slug: true, name: true, environment: true, primaryMuscle: true },
      });
      const { training: mappedTraining, unmatchedCount } = mapAiTrainingToExistingExercises(
        planResult.training,
        exercisePool,
      );
      training = mappedTraining;
      nutrition = planResult.nutrition;
      if (unmatchedCount > 0) {
        trackEvent("ai_exercise_unmatched", { count: unmatchedCount });
      }
    } else {
      const exercisePool = await prisma.exercise.findMany({
        where: { ...(environment === "MIXED" ? {} : { environment }) },
        select: { slug: true, name: true },
      });
      training = generateWeeklyTrainingPlan({
        environment,
        daysPerWeek,
        sessionMinutes,
        exercisePool,
      });
      nutrition = generateWeeklyNutritionPlan({
        mealsPerDay: finalMealsPerDay,
        cookingTime: finalCookingTime,
        dietaryStyle: profile?.dietaryStyle ?? null,
        allergies: profile?.allergies ?? null,
        dislikes: profile?.dislikes ?? null,
      });
    }
  } else {
    const exercisePool = await prisma.exercise.findMany({
      where: { ...(environment === "MIXED" ? {} : { environment }) },
      select: { slug: true, name: true },
    });
    training = generateWeeklyTrainingPlan({
      environment,
      daysPerWeek,
      sessionMinutes,
      exercisePool,
    });
    nutrition = generateWeeklyNutritionPlan({
      mealsPerDay: finalMealsPerDay,
      cookingTime: finalCookingTime,
      dietaryStyle: profile?.dietaryStyle ?? null,
      allergies: profile?.allergies ?? null,
      dislikes: profile?.dislikes ?? null,
    });
  }

  const plan = await prisma.weeklyPlan.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: {
      trainingJson: training as unknown as Prisma.InputJsonValue,
      nutritionJson: nutrition as unknown as Prisma.InputJsonValue,
      status: "DRAFT",
    },
    create: {
      userId,
      weekStart,
      status: "DRAFT",
      trainingJson: training as unknown as Prisma.InputJsonValue,
      nutritionJson: nutrition as unknown as Prisma.InputJsonValue,
    },
  });

  return { status: 200, body: plan };
}
