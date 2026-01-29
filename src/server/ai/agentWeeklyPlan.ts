import { z } from "zod";
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

  let rationale = "";
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
      rationale = `${redFlag.message} He aplicado ajustes conservadores al plan.`;
      adjustments = {
        daysPerWeek: Math.max(1, (profile?.daysPerWeek ?? 3) - 1),
        sessionMinutes: Math.max(15, (profile?.sessionMinutes ?? 45) - 15),
        mealsPerDay: profile?.mealsPerDay ?? 3,
        cookingTime: profile?.cookingTime ?? "MIN_20",
      };
    } else {
      try {
        const parsed = JSON.parse(response.content) as {
          rationale?: string;
          adjustments?: typeof adjustments;
        };
        rationale = parsed.rationale ?? "Ajustes aplicados según adherencia y perfil.";
        adjustments = parsed.adjustments ?? {};
      } catch {
        rationale =
          adherence.training < 0.5 || adherence.nutrition < 0.5
            ? "He reducido la complejidad del plan para facilitar la adherencia."
            : "He aplicado ajustes menores basados en tu progreso.";
        if (adherence.training < 0.5) {
          adjustments.daysPerWeek = Math.max(1, (profile?.daysPerWeek ?? 3) - 1);
        }
        if (adherence.nutrition < 0.5) {
          adjustments.mealsPerDay = Math.max(2, (profile?.mealsPerDay ?? 3) - 1);
          adjustments.cookingTime = "MIN_10";
        }
      }
    }
  } catch {
    rationale = "Error al procesar ajustes. Se mantiene el plan actual.";
    adjustments = {};
  }

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

  const exercisePool = await prisma.exercise.findMany({
    where: {
      ...(finalEnvironment === "MIXED" ? {} : { environment: finalEnvironment }),
    },
    select: { slug: true, name: true },
  });

  const training = generateWeeklyTrainingPlan({
    environment: finalEnvironment,
    daysPerWeek: finalDaysPerWeek,
    sessionMinutes: finalSessionMinutes,
    exercisePool,
  });

  const nutrition = generateWeeklyNutritionPlan({
    mealsPerDay: finalMealsPerDay,
    cookingTime: finalCookingTime,
    dietaryStyle: profile?.dietaryStyle ?? null,
    allergies: profile?.allergies ?? null,
    dislikes: profile?.dislikes ?? null,
  });

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
