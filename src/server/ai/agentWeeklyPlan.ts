import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { trackEvent } from "@/src/server/lib/events";
import { logError } from "@/src/server/lib/logger";
import { prisma } from "@/src/server/db/prisma";
import { trackAiPlanAudit } from "@/src/server/ai/aiAudit";
import { getProvider } from "./getProvider";
import type { AIProvider } from "./provider";
import { MockProvider } from "./providers/mock";
import {
  generateWeeklyTrainingPlan,
  type WeeklyTrainingPlan,
} from "@/src/core/training/generateWeeklyTrainingPlan";
import { generateWeeklyNutritionPlan } from "@/src/core/nutrition/generateWeeklyNutritionPlan";
import {
  validateNutritionBeforePersist,
  validateTrainingBeforePersist,
} from "@/src/server/plan/validateWeeklyPlan";
import type { Prisma } from "@prisma/client";
import { getCreatePlanSystemPrompt } from "./prompts/createPlan";
import { getAdjustSystemPrompt, getAdjustUserPrompt } from "./prompts/adjustPlan";
import { detectRedFlags } from "./planAdjuster/redFlags";
import { calculateAdherence } from "./planAdjuster/adherence";
import {
  parseAdjustmentResponse,
  applyAdjustmentsToFinalParams,
} from "./planAdjuster/parseAdjustments";
import { upsertWeeklyPlan } from "./persistence/upsertWeeklyPlan";
import { badRequestBody } from "@/src/server/api/errorResponse";

const ALLOWED_EXERCISES_MAX = 160;

const BodySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function pickAllowedExercisesDeterministic<
  T extends { slug: string; name: string; environment: string },
>(exercises: T[], opts: { max: number }): T[] {
  const sorted = [...exercises].sort((a, b) => a.slug.localeCompare(b.slug));
  return sorted.slice(0, opts.max);
}

function normalizeWeekStart(weekStart: string): Date {
  return new Date(`${weekStart}T00:00:00.000Z`);
}

function pickTrainingDayIndices(daysPerWeek: number): number[] {
  const patterns: Record<number, number[]> = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 2, 4, 6],
    5: [0, 1, 3, 5, 6],
    6: [0, 1, 2, 4, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return patterns[Math.min(7, Math.max(1, daysPerWeek))] ?? [0, 2, 4];
}

/**
 * Schema Zod único para el output del modelo (training + nutrition).
 * Usado para parse -> validate; si falla se hace fallback conservador y no se persiste nada nuevo.
 */
export const AiPlanOutputSchema = z.object({
  training: z.object({
    environment: z.enum(["GYM", "HOME", "CALISTHENICS", "POOL", "MIXED", "ESTIRAMIENTOS"]),
    daysPerWeek: z.number(),
    sessionMinutes: z.number(),
    sessions: z.array(
      z.object({
        dayIndex: z.number(),
        name: z.string(),
        exercises: z.array(
          z.object({
            slug: z.string(),
            name: z.string(),
            sets: z.number(),
            reps: z.string(),
            restSec: z.number(),
          }),
        ),
      }),
    ),
  }),
  nutrition: z.object({
    mealsPerDay: z.number(),
    cookingTime: z.enum(["MIN_10", "MIN_20", "MIN_40", "FLEXIBLE"]),
    dietaryStyle: z.string().nullable().optional(),
    allergies: z.string().nullable().optional(),
    dislikes: z.string().nullable().optional(),
    days: z.array(
      z.object({
        dayIndex: z.number(),
        meals: z.array(
          z.object({
            slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
            title: z.string(),
            minutes: z.number(),
            tags: z.array(z.string()),
            ingredients: z.array(z.string()),
            instructions: z.string(),
            substitutions: z.array(z.object({ title: z.string(), minutes: z.number() })),
          }),
        ),
      }),
    ),
  }),
});

// const PlanFromApiSchema = AiPlanOutputSchema; // No usado en nueva implementación

// function validateAiPlanAgainstConstraints(
//   data: z.infer<typeof AiPlanOutputSchema>,
//   expected: { preferredTrainingDayIndices: number[] },
// ): { ok: true } | { ok: false; reason: string } {
//   const expectedIdx = new Set(expected.preferredTrainingDayIndices);
//   const gotIdx = data.training.sessions.map((s) => s.dayIndex);
//   if (gotIdx.length !== expected.preferredTrainingDayIndices.length) {
//     return { ok: false, reason: "training_sessions_length_mismatch" };
//   }
//   for (const i of gotIdx) {
//     if (!expectedIdx.has(i)) return { ok: false, reason: "training_dayIndex_not_preferred" };
//   }
//   return { ok: true };
// } // No usado en nueva implementación

async function generatePlanFromApi(
  provider: AIProvider,
  args: {
    profile: {
      level?: string | null;
      goal?: string | null;
      injuryNotes?: string | null;
      equipmentNotes?: string | null;
      dietaryStyle?: string | null;
      allergies?: string | null;
      dislikes?: string | null;
    } | null;
    finalEnvironment: string;
    finalDaysPerWeek: number;
    finalSessionMinutes: number;
    finalMealsPerDay: number;
    finalCookingTime: string;
    allowedExercises: Array<{ slug: string; name: string; environment: string }>;
  },
): Promise<
  | {
      ok: true;
      training: ReturnType<typeof generateWeeklyTrainingPlan>;
      nutrition: ReturnType<typeof generateWeeklyNutritionPlan>;
      exercisesToUpsert: Array<{ slug: string; name: string; environment: string }>;
    }
  | { ok: false; reason: string; detail?: string }
> {
  try {
    const pool = args.allowedExercises;
    const allowlist =
      pool.length > ALLOWED_EXERCISES_MAX
        ? pickAllowedExercisesDeterministic(pool, { max: ALLOWED_EXERCISES_MAX })
        : pool;

    if (pool.length > allowlist.length) {
      trackEvent("ai_allowed_exercises_trimmed", {
        from: pool.length,
        to: allowlist.length,
        environment: args.finalEnvironment,
      });
    }

    const trainingDayIndices = pickTrainingDayIndices(args.finalDaysPerWeek);
    const systemPrompt = getCreatePlanSystemPrompt();
    const userPayload = {
      profile: args.profile,
      finalEnvironment: args.finalEnvironment,
      finalDaysPerWeek: args.finalDaysPerWeek,
      finalSessionMinutes: args.finalSessionMinutes,
      trainingDayIndices,
      finalMealsPerDay: args.finalMealsPerDay,
      finalCookingTime: args.finalCookingTime,
      allowedExercises: allowlist,
      outputSchemaHint: "AiPlanOutputSchema",
    };
    // Nota: El output total (7 días nutrición) es grande; forzar contenido compacto.
    const createPlanMessages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: JSON.stringify(userPayload) },
    ];
    console.log(
      "[AI prompt - create plan] system:",
      systemPrompt.slice(0, 300) + (systemPrompt.length > 300 ? "..." : ""),
    );
    console.log("[AI prompt - create plan] user (payload):", JSON.stringify(userPayload, null, 2));
    const response = await provider.chat(createPlanMessages, { maxTokens: 3000 });
    console.log(
      "[AI response - create plan]",
      response.content.slice(0, 1500) + (response.content.length > 1500 ? "\n... (truncado)" : ""),
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch (err) {
      Sentry.captureMessage("weekly_plan_fallback_ai_invalid_output", {
        tags: { fallback_type: "ai_invalid_output" },
        extra: { err, content: response.content.slice(0, 500) },
      });
      const contentSnippet = response.content.slice(0, 500);
      return { ok: false, reason: "invalid_json", detail: contentSnippet };
    }

    const validation = AiPlanOutputSchema.safeParse(parsed);
    if (!validation.success) {
      Sentry.captureMessage("weekly_plan_fallback_ai_invalid_output", {
        tags: { fallback_type: "ai_invalid_output" },
        extra: { errors: validation.error.flatten() },
      });
      return {
        ok: false,
        reason: "validation_failed",
        detail: JSON.stringify(validation.error.flatten()),
      };
    }

    const data = validation.data;

    // Guardrails: asegurar que el output respeta constraints críticos
    if (
      data.training.environment !== args.finalEnvironment ||
      data.training.daysPerWeek !== args.finalDaysPerWeek ||
      data.training.sessionMinutes !== args.finalSessionMinutes ||
      data.nutrition.mealsPerDay !== args.finalMealsPerDay ||
      data.nutrition.cookingTime !== args.finalCookingTime
    ) {
      Sentry.captureMessage("weekly_plan_fallback_ai_invalid_output", {
        tags: { fallback_type: "ai_constraints_mismatch" },
        extra: {
          expected: {
            environment: args.finalEnvironment,
            daysPerWeek: args.finalDaysPerWeek,
            sessionMinutes: args.finalSessionMinutes,
            mealsPerDay: args.finalMealsPerDay,
            cookingTime: args.finalCookingTime,
          },
          got: {
            environment: data.training.environment,
            daysPerWeek: data.training.daysPerWeek,
            sessionMinutes: data.training.sessionMinutes,
            mealsPerDay: data.nutrition.mealsPerDay,
            cookingTime: data.nutrition.cookingTime,
          },
        },
      });
      return {
        ok: false,
        reason: "ai_constraints_mismatch",
        detail: "Training/nutrition constraints did not match request",
      };
    }

    const gotIdx = data.training.sessions.map((s) => s.dayIndex).sort((a, b) => a - b);
    const expectedIdx = [...trainingDayIndices].sort((a, b) => a - b);
    if (
      data.training.sessions.length !== args.finalDaysPerWeek ||
      JSON.stringify(gotIdx) !== JSON.stringify(expectedIdx)
    ) {
      Sentry.captureMessage("weekly_plan_fallback_ai_invalid_output", {
        tags: { fallback_type: "training_dayIndex_not_preferred" },
        extra: { gotIdx, expectedIdx, sessionsLen: data.training.sessions.length },
      });
      return {
        ok: false,
        reason: "training_dayIndex_not_preferred",
        detail: JSON.stringify({ gotIdx, expectedIdx }),
      };
    }

    const poolBySlug = new Map(pool.map((e) => [e.slug.toLowerCase(), e]));
    const promptAllowSlugs = new Set(allowlist.map((e) => e.slug.toLowerCase()));
    let outsidePromptAllowlistCount = 0;
    const exercisesToUpsert: Array<{ slug: string; name: string; environment: string }> = [];
    const seen = new Set<string>();

    for (const s of data.training.sessions) {
      for (const ex of s.exercises) {
        const slugLower = ex.slug.toLowerCase();
        const match = poolBySlug.get(slugLower);
        if (!match) {
          Sentry.captureMessage("weekly_plan_fallback_ai_exercise_not_in_pool", {
            tags: { fallback_type: "ai_exercise_not_in_pool" },
            extra: {
              slug: ex.slug,
              name: ex.name,
              environment: args.finalEnvironment,
              poolSize: pool.length,
              allowlistSize: allowlist.length,
            },
          });
          return {
            ok: false,
            reason: "exercise_not_in_pool",
            detail: `slug: ${ex.slug}, name: ${ex.name}`,
          };
        }
        if (!promptAllowSlugs.has(slugLower)) {
          outsidePromptAllowlistCount += 1;
        }
        if (!seen.has(slugLower)) {
          seen.add(slugLower);
          exercisesToUpsert.push({
            slug: match.slug,
            name: match.name,
            environment: match.environment,
          });
        }
      }
    }

    if (outsidePromptAllowlistCount > 0) {
      trackEvent("ai_slug_outside_prompt_allowlist", {
        count: outsidePromptAllowlistCount,
        environment: args.finalEnvironment,
        allowlistSize: allowlist.length,
        poolSize: pool.length,
      });
    }

    return {
      ok: true as const,
      training: { ...data.training, schemaVersion: 1 },
      nutrition: { ...data.nutrition, schemaVersion: 1 },
      exercisesToUpsert,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { context: "generatePlanFromApi" },
    });
    const message = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : "Error";
    return { ok: false, reason: "provider_error", detail: `${name}: ${message}` };
  }
}

export { generatePlanFromApi };

type AiTrainingSession = {
  dayIndex: number;
  name: string;
  exercises: Array<{
    slug: string;
    name: string;
    sets: number;
    reps: string;
    restSec: number;
  }>;
};

type AiTraining = {
  environment: string;
  daysPerWeek: number;
  sessionMinutes: number;
  sessions: AiTrainingSession[];
};

type PoolEntry = {
  slug: string;
  name: string;
  environment: string;
  primaryMuscle?: string | null;
};

/**
 * Maps AI-generated training to existing DB exercises only (no persist).
 * Match: by slug in pool, else by name (case-insensitive), else fallback by environment (deterministic).
 */
export function mapAiTrainingToExistingExercises(
  training: AiTraining,
  exercisePool: PoolEntry[],
): { training: AiTraining; unmatchedCount: number } {
  const envPool =
    training.environment === "MIXED"
      ? [...exercisePool].sort((a, b) => a.slug.localeCompare(b.slug))
      : exercisePool
          .filter((e) => e.environment === training.environment)
          .sort((a, b) => a.slug.localeCompare(b.slug));
  const fallback = envPool[0] ?? exercisePool[0];
  let unmatchedCount = 0;

  const bySlug = new Map(exercisePool.map((e) => [e.slug.toLowerCase(), e]));
  const byName = new Map(exercisePool.map((e) => [e.name.toLowerCase().trim(), e]));

  const sessions: AiTrainingSession[] = training.sessions.map((s) => ({
    ...s,
    exercises: s.exercises.map((ex) => {
      const bySlugMatch = bySlug.get(ex.slug.toLowerCase());
      if (bySlugMatch) {
        return {
          slug: bySlugMatch.slug,
          name: bySlugMatch.name,
          sets: ex.sets,
          reps: ex.reps,
          restSec: ex.restSec,
        };
      }
      const byNameMatch = byName.get(ex.name.toLowerCase().trim());
      if (byNameMatch) {
        return {
          slug: byNameMatch.slug,
          name: byNameMatch.name,
          sets: ex.sets,
          reps: ex.reps,
          restSec: ex.restSec,
        };
      }
      unmatchedCount += 1;
      if (!fallback) {
        throw new Error("No exercise pool for mapping");
      }
      return {
        slug: fallback.slug,
        name: fallback.name,
        sets: ex.sets,
        reps: ex.reps,
        restSec: ex.restSec,
      };
    }),
  }));

  return {
    training: { ...training, sessions },
    unmatchedCount,
  };
}

export async function adjustWeeklyPlan(body: unknown, userId: string) {
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_BODY", details: parsed.error.flatten() } };
  }

  const { weekStart } = parsed.data;
  const weekStartDate = normalizeWeekStart(weekStart);

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const currentPlan = await prisma.weeklyPlan.findUnique({
    where: { userId_weekStart: { userId, weekStart: weekStartDate } },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [trainingLogs, nutritionLogs] = await Promise.all([
    prisma.trainingLog.findMany({
      where: { userId, occurredAt: { gte: sevenDaysAgo } },
      select: { completed: true, pain: true, painNotes: true },
    }),
    prisma.nutritionLog.findMany({
      where: { userId, occurredAt: { gte: sevenDaysAgo } },
      select: { followedPlan: true },
    }),
  ]);

  const redFlag = detectRedFlags(trainingLogs);
  const adherence = calculateAdherence(trainingLogs, nutritionLogs);

  const provider = getProvider();
  const systemPrompt = getAdjustSystemPrompt();
  const userPrompt = getAdjustUserPrompt({
    profile: profile ?? null,
    trainingCompleted: trainingLogs.filter((l) => l.completed).length,
    trainingTotal: trainingLogs.length,
    nutritionFollowed: nutritionLogs.filter((l) => l.followedPlan).length,
    nutritionTotal: nutritionLogs.length,
    redFlag,
    currentPlanExists: !!currentPlan,
  });

  let rationale = "";
  let fallbackType: "red_flag" | "parse_error" | "provider_error" | "none" = "none";
  let adjustments: {
    daysPerWeek?: number | null;
    sessionMinutes?: number | null;
    environment?: string | null;
    mealsPerDay?: number | null;
    cookingTime?: string | null;
  } = {};

  try {
    console.log(
      "[AI prompt - adjust plan] system:",
      systemPrompt.slice(0, 400) + (systemPrompt.length > 400 ? "..." : ""),
    );
    console.log("[AI prompt - adjust plan] user:", userPrompt);
    const response = await provider.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);
    console.log("[AI response - adjust plan]", response.content);

    const parsed = parseAdjustmentResponse({
      content: response.content,
      redFlag,
      adherence,
      profile: profile ?? null,
    });
    rationale = parsed.rationale;
    fallbackType = parsed.fallbackType;
    adjustments = parsed.adjustments;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errName = error instanceof Error ? error.name : "Error";
    logError("agent", "AI provider failed", { error: errMsg });
    Sentry.captureException(error, {
      tags: { fallback_type: "provider_error" },
    });
    return {
      status: 502,
      body: {
        error: "AI_PROVIDER_ERROR",
        message: errMsg,
        detail: `${errName}: ${errMsg}`,
      },
    };
  }

  trackEvent(
    "agent_adjustments_applied",
    { fallback_type: fallbackType },
    {
      sentry: fallbackType !== "none",
    },
  );

  const finalParams = applyAdjustmentsToFinalParams({
    adjustments,
    profile: profile ?? null,
  });
  const {
    finalDaysPerWeek,
    finalSessionMinutes,
    finalEnvironment,
    finalMealsPerDay,
    finalCookingTime,
  } = finalParams;

  const t0 = Date.now();
  const providerName = "mock";

  const exercisePool = await prisma.exercise.findMany({
    where: { ...(finalEnvironment === "MIXED" ? {} : { environment: finalEnvironment }) },
    select: { slug: true, name: true },
  });
  const poolSizeForAudit = exercisePool.length;
  const training = generateWeeklyTrainingPlan({
    environment: finalEnvironment,
    daysPerWeek: finalDaysPerWeek,
    sessionMinutes: finalSessionMinutes,
    exercisePool,
  });
  let nutrition = generateWeeklyNutritionPlan({
    mealsPerDay: finalMealsPerDay,
    cookingTime: finalCookingTime,
    dietaryStyle: profile?.dietaryStyle ?? null,
    allergies: profile?.allergies ?? null,
    dislikes: profile?.dislikes ?? null,
  });

  const sessionsCount = training?.sessions?.length ?? null;
  const totalExercises = Array.isArray(training?.sessions)
    ? training.sessions.reduce((acc, s) => acc + (s.exercises?.length ?? 0), 0)
    : null;
  trackAiPlanAudit(
    { kind: "success" },
    {
      context: "adjustWeeklyPlan",
      provider: providerName,
      environment: finalEnvironment,
      daysPerWeek: finalDaysPerWeek,
      sessionMinutes: finalSessionMinutes,
      mealsPerDay: finalMealsPerDay,
      cookingTime: finalCookingTime,
      poolSize: poolSizeForAudit,
      sessionsCount: sessionsCount ?? undefined,
      totalExercises: totalExercises ?? undefined,
      unmatchedCount: undefined,
      durationMs: Date.now() - t0,
    },
  );

  const now = new Date();
  const rationaleStr = rationale.trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let v = validateNutritionBeforePersist(nutrition as any);
  if (!v.ok) {
    trackEvent(
      "weekly_plan_invalid_before_persist",
      { reason: v.reason, context: "adjustWeeklyPlan" },
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
  const vt = validateTrainingBeforePersist(training);
  if (!vt.ok) {
    return { status: 400, body: badRequestBody("INVALID_TRAINING_PLAN") };
  }

  const metadata = {
    generatedBy: "agent",
    promptVersion: "adjustPlan@2026-02-04",
    model: providerName,
    generatedAt: now.toISOString(),
  };
  const trainingForJson = { ...vt.normalized, metadata };
  const nutritionForJson = {
    ...(v.ok ? v.normalized : nutrition),
    metadata,
  };

  const plan = await upsertWeeklyPlan({
    userId,
    weekStart: weekStartDate,
    trainingJson: trainingForJson as unknown as Prisma.InputJsonValue,
    nutritionJson: nutritionForJson as unknown as Prisma.InputJsonValue,
    lastRationale: rationaleStr,
    lastGeneratedAt: now,
  });

  return {
    status: 200,
    body: {
      plan,
      rationale: rationale.trim(),
    },
  };
}
