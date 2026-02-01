import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { trackEvent } from "@/src/server/lib/events";
import { prisma } from "@/src/server/db/prisma";
import { getProvider } from "./getProvider";
import { generateWeeklyTrainingPlan } from "@/src/core/training/generateWeeklyTrainingPlan";
import { generateWeeklyNutritionPlan } from "@/src/core/nutrition/generateWeeklyNutritionPlan";
import type { Prisma } from "@prisma/client";

const BodySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function normalizeWeekStart(weekStart: string): Date {
  return new Date(`${weekStart}T00:00:00.000Z`);
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
    environment: z.enum(["GYM", "HOME", "CALISTHENICS", "POOL", "MIXED"]),
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

const PlanFromApiSchema = AiPlanOutputSchema;

async function generatePlanFromApi(
  provider: {
    chat: (
      m: { role: string; content: string }[],
      o?: { maxTokens?: number },
    ) => Promise<{ content: string }>;
  },
  args: {
    profile: {
      level?: string;
      goal?: string;
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
  },
): Promise<{
  training: ReturnType<typeof generateWeeklyTrainingPlan>;
  nutrition: ReturnType<typeof generateWeeklyNutritionPlan>;
  exercisesToUpsert: Array<{ slug: string; name: string; environment: string }>;
} | null> {
  const profile = args.profile;
  const systemPrompt = `Eres un generador de planes semanales de entrenamiento y nutrición. Genera un plan PERSONALIZADO según el perfil del usuario.
Reglas: NO diagnóstico médico. Respeta alergias, dislikes y preferencias dietéticas. Para principiantes: volumen moderado y técnica. Para lesiones: evita ejercicios de riesgo.
Responde SOLO con un JSON válido (sin markdown) con esta estructura exacta:
{
  "training": {
    "environment": "GYM|HOME|CALISTHENICS|POOL|MIXED",
    "daysPerWeek": número,
    "sessionMinutes": número,
    "sessions": [{ "dayIndex": 0-6, "name": "Session A", "exercises": [{ "slug": "slug-ejercicio", "name": "Nombre", "sets": 3, "reps": "8-12", "restSec": 90 }] }]
  },
  "nutrition": {
    "mealsPerDay": 2-5,
    "cookingTime": "MIN_10|MIN_20|MIN_40|FLEXIBLE",
    "days": [{ "dayIndex": 0-6, "meals": [{ "slot": "breakfast|lunch|dinner|snack", "title": "...", "minutes": número, "tags": [], "ingredients": [], "instructions": "...", "substitutions": [{ "title": "...", "minutes": número }] }] }]
  }
}`;

  const userPrompt = `Perfil: nivel ${profile?.level ?? "BEGINNER"}, objetivo ${profile?.goal ?? "general fitness"}, entorno ${args.finalEnvironment}, ${args.finalDaysPerWeek} días/semana, ${args.finalSessionMinutes} min/sesión.
Nutrición: ${args.finalMealsPerDay} comidas/día, tiempo cocina ${args.finalCookingTime}, dieta ${profile?.dietaryStyle ?? "ninguna"}, alergias ${profile?.allergies ?? "ninguna"}, dislikes ${profile?.dislikes ?? "ninguna"}.
${profile?.injuryNotes ? `Notas lesiones: ${profile.injuryNotes}` : ""}
${profile?.equipmentNotes ? `Equipamiento: ${profile.equipmentNotes}` : ""}

Genera el plan personalizado en JSON.`;

  try {
    const res = await provider.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 4000 },
    );
    const jsonMatch = res.content.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(res.content);
    const parsed = PlanFromApiSchema.safeParse(raw);
    if (!parsed.success) {
      Sentry.captureMessage("weekly_plan_fallback_ai_invalid_output", {
        tags: { fallback_type: "ai_invalid_output" },
      });
      return null;
    }
    const data = parsed.data;
    const seen = new Set<string>();
    const exercisesToUpsert: Array<{ slug: string; name: string; environment: string }> = [];
    for (const s of data.training.sessions) {
      for (const ex of s.exercises) {
        if (!seen.has(ex.slug)) {
          seen.add(ex.slug);
          exercisesToUpsert.push({
            slug: ex.slug,
            name: ex.name,
            environment: data.training.environment,
          });
        }
      }
    }
    return {
      training: data.training,
      nutrition: {
        ...data.nutrition,
        dietaryStyle: data.nutrition.dietaryStyle ?? profile?.dietaryStyle ?? null,
        allergies: data.nutrition.allergies ?? profile?.allergies ?? null,
        dislikes: data.nutrition.dislikes ?? profile?.dislikes ?? null,
      },
      exercisesToUpsert,
    };
  } catch (err) {
    const isProviderError =
      err instanceof Error && (err.name === "AbortError" || err.message.startsWith("OpenAI API error"));
    Sentry.captureMessage(
      isProviderError ? "weekly_plan_fallback_provider_error" : "weekly_plan_fallback_ai_invalid_output",
      { tags: { fallback_type: isProviderError ? "provider_error" : "ai_invalid_output" } },
    );
    return null;
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
        return { slug: bySlugMatch.slug, name: bySlugMatch.name, sets: ex.sets, reps: ex.reps, restSec: ex.restSec };
      }
      const byNameMatch = byName.get(ex.name.toLowerCase().trim());
      if (byNameMatch) {
        return { slug: byNameMatch.slug, name: byNameMatch.name, sets: ex.sets, reps: ex.reps, restSec: ex.restSec };
      }
      unmatchedCount += 1;
      if (!fallback) {
        throw new Error("No exercise pool for mapping");
      }
      return { slug: fallback.slug, name: fallback.name, sets: ex.sets, reps: ex.reps, restSec: ex.restSec };
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
    "mealsPerDay": número (2-5) o null si mantener,
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
    const response = await provider.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

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
    fallbackType = "provider_error";
    Sentry.captureException(error, {
      tags: { fallback_type: "provider_error" },
    });
    rationale = "Error al procesar ajustes. Se mantiene el plan actual.";
    adjustments = {};
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
    (adjustments.environment as "GYM" | "HOME" | "CALISTHENICS" | "POOL" | "MIXED" | undefined) ??
    profile?.environment ??
    "GYM";
  const finalMealsPerDay = adjustments.mealsPerDay ?? profile?.mealsPerDay ?? 3;
  const finalCookingTime =
    (adjustments.cookingTime as "MIN_10" | "MIN_20" | "MIN_40" | "FLEXIBLE" | undefined) ??
    profile?.cookingTime ??
    "MIN_20";

  const useApiForPlan = Boolean(process.env.OPENAI_API_KEY);

  let training: ReturnType<typeof generateWeeklyTrainingPlan>;
  let nutrition: ReturnType<typeof generateWeeklyNutritionPlan>;

  if (useApiForPlan) {
    const planResult = await generatePlanFromApi(provider, {
      profile,
      finalEnvironment,
      finalDaysPerWeek,
      finalSessionMinutes,
      finalMealsPerDay,
      finalCookingTime,
    });
    if (planResult) {
      const exercisePool = await prisma.exercise.findMany({
        where: { ...(finalEnvironment === "MIXED" ? {} : { environment: finalEnvironment }) },
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
        where: { ...(finalEnvironment === "MIXED" ? {} : { environment: finalEnvironment }) },
        select: { slug: true, name: true },
      });
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
  } else {
    const exercisePool = await prisma.exercise.findMany({
      where: { ...(finalEnvironment === "MIXED" ? {} : { environment: finalEnvironment }) },
      select: { slug: true, name: true },
    });
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

  const now = new Date();
  const rationaleStr = rationale.trim();
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
