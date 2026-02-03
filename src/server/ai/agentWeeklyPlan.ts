import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { trackEvent } from "@/src/server/lib/events";
import { logInfo, logError } from "@/src/server/lib/logger";
import { prisma } from "@/src/server/db/prisma";
import { trackAiPlanAudit } from "@/src/server/ai/aiAudit";
import { getProvider } from "./getProvider";
import type { AIProvider } from "./provider";
import { MockProvider } from "./providers/mock";
import {
  generateWeeklyTrainingPlan,
  type WeeklyTrainingPlan,
} from "@/src/core/training/generateWeeklyTrainingPlan";
import {
  generateWeeklyNutritionPlan,
  repairDuplicateTitlesInPlan,
} from "@/src/core/nutrition/generateWeeklyNutritionPlan";
import { validateNutritionBeforePersist } from "@/src/server/plan/validateWeeklyPlan";
import type { Prisma } from "@prisma/client";

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

type RedFlag = {
  detected: boolean;
  message?: string;
};

function detectRedFlags(logs: Array<{ pain: boolean; painNotes: string | null }>): RedFlag {
  const hasPain = logs.some((l) => l.pain);
  const painNotes = logs
    .filter((l) => l.pain && l.painNotes)
    .map((l) => l.painNotes?.toLowerCase() ?? "")
    .join(" ");
  const redFlagKeywords = [
    "agudo",
    "mareos",
    "dificultad respiratoria",
    "lesión",
    "lesion",
    "grave",
    "intenso",
  ];

  if (hasPain && redFlagKeywords.some((kw) => painNotes.includes(kw))) {
    return {
      detected: true,
      message:
        "He detectado señales que requieren atención profesional. Recomiendo consultar con un profesional sanitario antes de continuar.",
    };
  }

  return { detected: false };
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
    const systemPrompt = `Eres un asistente experto en fitness y nutrición.

Devuelve SOLO JSON válido (sin markdown, sin texto adicional).

Debes devolver EXACTAMENTE este shape:
{
  "training": {
    "environment": "GYM|HOME|CALISTHENICS|POOL|MIXED|ESTIRAMIENTOS",
    "daysPerWeek": number,
    "sessionMinutes": number,
    "sessions": [
      {
        "dayIndex": number,
        "name": string,
        "exercises": [
          { "slug": string, "name": string, "sets": number, "reps": string, "restSec": number }
        ]
      }
    ]
  },
  "nutrition": {
    "mealsPerDay": number,
    "cookingTime": "MIN_10|MIN_20|MIN_40|FLEXIBLE",
    "dietaryStyle": string|null,
    "allergies": string|null,
    "dislikes": string|null,
    "days": [
      {
        "dayIndex": number,
        "meals": [
          {
            "slot": "breakfast|lunch|dinner|snack",
            "title": string,
            "minutes": number,
            "tags": string[],
            "ingredients": string[],
            "instructions": string,
            "substitutions": [{ "title": string, "minutes": number }]
          }
        ]
      }
    ]
  }
}

REGLAS OBLIGATORIAS:
- training.environment == finalEnvironment; training.daysPerWeek == finalDaysPerWeek; training.sessionMinutes == finalSessionMinutes.
- training.sessions.length == finalDaysPerWeek.
- Usa EXACTAMENTE los dayIndex indicados en trainingDayIndices (uno por sesión, sin repetir).
- Usa SOLO ejercicios de allowedExercises (match por slug exacto). No inventes slugs.
- nutrition.mealsPerDay == finalMealsPerDay; nutrition.cookingTime == finalCookingTime.
- nutrition.days.length == 7 con dayIndex 0..6 sin repetir.
- En cada día: meals.length == mealsPerDay y no repitas slot.
- title descriptivo (>=10 chars), ingredients >=2, instructions >=20 chars, substitutions >=1.

SALIDA COMPACTA (OBLIGATORIO):
- tags: [] (vacío) salvo que sea realmente necesario.
- ingredients: EXACTAMENTE 2 strings cortos por comida.
- instructions: 20-40 caracteres (una frase corta).
- substitutions: EXACTAMENTE 1 item por comida con title corto y minutes <= 20.
- training: 1-3 ejercicios por sesión (evita listas largas).`;
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
      return null;
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
      training: data.training,
      nutrition: data.nutrition,
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

function calculateAdherence(
  trainingLogs: Array<{ completed: boolean }>,
  nutritionLogs: Array<{ followedPlan: boolean }>,
): { training: number; nutrition: number } {
  const trainingAdherence =
    trainingLogs.length > 0
      ? trainingLogs.filter((l) => l.completed).length / trainingLogs.length
      : 1;
  const nutritionAdherence =
    nutritionLogs.length > 0
      ? nutritionLogs.filter((l) => l.followedPlan).length / nutritionLogs.length
      : 1;
  return { training: trainingAdherence, nutrition: nutritionAdherence };
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
  const systemPrompt = `Eres un asistente de entrenamiento y nutrición. Analiza el perfil del usuario y sus logs recientes para proponer ajustes seguros al plan semanal.

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

  const userPrompt = `Perfil:
- Nivel: ${profile?.level ?? "BEGINNER"}
- Días/semana actuales: ${profile?.daysPerWeek ?? 3}
- Minutos/sesión: ${profile?.sessionMinutes ?? 45}
- Entorno: ${profile?.environment ?? "GYM"}
- Comidas/día: ${profile?.mealsPerDay ?? 3}
- Tiempo cocina: ${profile?.cookingTime ?? "MIN_20"}

Logs últimos 7 días:
- Sesiones completadas: ${trainingLogs.filter((l) => l.completed).length}/${trainingLogs.length}
- Comidas según plan: ${nutritionLogs.filter((l) => l.followedPlan).length}/${nutritionLogs.length}
${redFlag.detected ? `- RED FLAG: ${redFlag.message}` : ""}

Plan actual: ${currentPlan ? "existe" : "no existe"}

Propón ajustes seguros basados en adherencia y perfil.`;

  /**
   * Adjustment rules (MVP)
   * - Based on 7-day trends only
   * - Apply at most ONE category of change per regeneration:
   *   training volume OR training intensity OR nutrition simplicity
   * - Never adjust if data is insufficient
   * - Pain signals override adherence
   * See specs/08_ai_agent_mvp.md for the decision table
   */
  let adjustmentApplied = false;
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
    if (process.env.OPENAI_API_KEY) {
      logInfo("agent", "Weekly plan generated with OpenAI");
    }

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
        const parsed = JSON.parse(response.content) as {
          rationale?: string;
          adjustments?: typeof adjustments;
        };
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
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errName = error instanceof Error ? error.name : "Error";
    logError("agent", "OpenAI provider failed", { error: errMsg });
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
    profile?.environment ??
    "GYM";
  const finalMealsPerDay = adjustments.mealsPerDay ?? profile?.mealsPerDay ?? 3;
  const finalCookingTime =
    (adjustments.cookingTime as "MIN_10" | "MIN_20" | "MIN_40" | "FLEXIBLE" | undefined) ??
    profile?.cookingTime ??
    "MIN_20";

  const t0 = Date.now();
  const providerName = process.env.OPENAI_API_KEY ? "openai" : "mock";
  const useApiForPlan = Boolean(process.env.OPENAI_API_KEY);

  let training: ReturnType<typeof generateWeeklyTrainingPlan>;
  let nutrition: ReturnType<typeof generateWeeklyNutritionPlan>;
  let unmatchedCountForAudit: number | undefined;
  let poolSizeForAudit = 0;

  if (useApiForPlan) {
    const exercisePool = await prisma.exercise.findMany({
      where: { ...(finalEnvironment === "MIXED" ? {} : { environment: finalEnvironment }) },
      select: { slug: true, name: true, environment: true, primaryMuscle: true },
    });
    poolSizeForAudit = exercisePool.length;
    if (exercisePool.length === 0) {
      trackAiPlanAudit(
        { kind: "fallback", fallbackType: "no_exercises_available" },
        {
          context: "adjustWeeklyPlan",
          provider: providerName as "openai" | "mock",
          environment: finalEnvironment,
          daysPerWeek: finalDaysPerWeek,
          sessionMinutes: finalSessionMinutes,
          mealsPerDay: finalMealsPerDay,
          cookingTime: finalCookingTime,
          poolSize: exercisePool.length,
          durationMs: Date.now() - t0,
        },
      );
    }
    const planResult = await generatePlanFromApi(provider, {
      profile,
      finalEnvironment,
      finalDaysPerWeek,
      finalSessionMinutes,
      finalMealsPerDay,
      finalCookingTime,
      allowedExercises: exercisePool,
    });
    if (!planResult.ok) {
      return {
        status: 502,
        body: {
          error: "AI_PLAN_FAILED",
          reason: planResult.reason,
          detail: planResult.detail,
        },
      };
    }
    const { training: mappedTraining, unmatchedCount } = mapAiTrainingToExistingExercises(
      planResult.training,
      exercisePool,
    );
    training = mappedTraining as WeeklyTrainingPlan;
    nutrition = repairDuplicateTitlesInPlan(planResult.nutrition);
    unmatchedCountForAudit = unmatchedCount;
    if (unmatchedCount > 0) {
      trackEvent("ai_exercise_unmatched", { count: unmatchedCount });
    }
  } else {
    const exercisePool = await prisma.exercise.findMany({
      where: { ...(finalEnvironment === "MIXED" ? {} : { environment: finalEnvironment }) },
      select: { slug: true, name: true },
    });
    poolSizeForAudit = exercisePool.length;
    training = generateWeeklyTrainingPlan({
      environment: finalEnvironment,
      daysPerWeek: finalDaysPerWeek,
      sessionMinutes: finalSessionMinutes,
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

  const sessionsCount = training?.sessions?.length ?? null;
  const totalExercises = Array.isArray(training?.sessions)
    ? training.sessions.reduce((acc, s) => acc + (s.exercises?.length ?? 0), 0)
    : null;
  trackAiPlanAudit(
    { kind: "success" },
    {
      context: "adjustWeeklyPlan",
      provider: providerName as "openai" | "mock",
      environment: finalEnvironment,
      daysPerWeek: finalDaysPerWeek,
      sessionMinutes: finalSessionMinutes,
      mealsPerDay: finalMealsPerDay,
      cookingTime: finalCookingTime,
      poolSize: poolSizeForAudit,
      sessionsCount: sessionsCount ?? undefined,
      totalExercises: totalExercises ?? undefined,
      unmatchedCount: unmatchedCountForAudit,
      durationMs: Date.now() - t0,
    },
  );

  const now = new Date();
  const rationaleStr = rationale.trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = validateNutritionBeforePersist(nutrition as any);
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
  }

  const plan = await prisma.weeklyPlan.upsert({
    where: { userId_weekStart: { userId, weekStart: weekStartDate } },
    update: {
      trainingJson: training as unknown as Prisma.InputJsonValue,
      nutritionJson: nutrition as unknown as Prisma.InputJsonValue,
      status: "DRAFT",
      lastRationale: rationaleStr,
      lastGeneratedAt: now,
    },
    create: {
      userId,
      weekStart: weekStartDate,
      status: "DRAFT",
      trainingJson: training as unknown as Prisma.InputJsonValue,
      nutritionJson: nutrition as unknown as Prisma.InputJsonValue,
      lastRationale: rationaleStr,
      lastGeneratedAt: now,
    },
  });

  return {
    status: 200,
    body: {
      plan,
      rationale: rationale.trim(),
    },
  };
}
