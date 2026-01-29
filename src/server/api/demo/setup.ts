import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";
import { TrainingEnvironment, ActivityLevel, CookingTime } from "@prisma/client";

const DEMO_EMAIL = "demo@pipos.local";

const SetupBody = z.object({
  goal: z.string().optional(),
  level: z.nativeEnum(ActivityLevel).optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  sessionMinutes: z.number().int().min(15).max(180).optional(),
  environment: z.nativeEnum(TrainingEnvironment).optional(),
  equipmentNotes: z.string().optional(),
  injuryNotes: z.string().optional(),
  dietaryStyle: z.string().optional(),
  allergies: z.string().optional(),
  dislikes: z.string().optional(),
  cookingTime: z.nativeEnum(CookingTime).optional(),
  mealsPerDay: z.number().int().min(2).max(5).optional(),
});

export async function setupDemo(body: unknown) {
  const parsed = SetupBody.safeParse(body ?? {});
  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_BODY", details: parsed.error.flatten() } };
  }

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL },
  });

  const data = parsed.data;
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {
      goal: data.goal ?? undefined,
      level: data.level ?? undefined,
      daysPerWeek: data.daysPerWeek ?? undefined,
      sessionMinutes: data.sessionMinutes ?? undefined,
      environment: data.environment ?? undefined,
      equipmentNotes: data.equipmentNotes ?? undefined,
      injuryNotes: data.injuryNotes ?? undefined,
      dietaryStyle: data.dietaryStyle ?? undefined,
      allergies: data.allergies ?? undefined,
      dislikes: data.dislikes ?? undefined,
      cookingTime: data.cookingTime ?? undefined,
      mealsPerDay: data.mealsPerDay ?? undefined,
    },
    create: {
      userId: user.id,
      goal: data.goal ?? null,
      level: data.level ?? "BEGINNER",
      daysPerWeek: data.daysPerWeek ?? 3,
      sessionMinutes: data.sessionMinutes ?? 45,
      environment: data.environment ?? "GYM",
      equipmentNotes: data.equipmentNotes ?? null,
      injuryNotes: data.injuryNotes ?? null,
      dietaryStyle: data.dietaryStyle ?? null,
      allergies: data.allergies ?? null,
      dislikes: data.dislikes ?? null,
      cookingTime: data.cookingTime ?? "MIN_20",
      mealsPerDay: data.mealsPerDay ?? 3,
    },
  });

  return { status: 200, body: { userId: user.id } };
}
