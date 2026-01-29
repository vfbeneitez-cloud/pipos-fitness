import { z } from "zod";
import { prisma } from "@/src/server/db/prisma";

const TrainingEnvironmentSchema = z.enum(["GYM", "HOME", "CALISTHENICS", "POOL", "MIXED"]);
const ActivityLevelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
const CookingTimeSchema = z.enum(["MIN_10", "MIN_20", "MIN_40", "FLEXIBLE"]);

const ProfileBody = z.object({
  goal: z.string().optional(),
  level: ActivityLevelSchema.optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  sessionMinutes: z.number().int().min(15).max(180).optional(),
  environment: TrainingEnvironmentSchema.optional(),
  equipmentNotes: z.string().optional(),
  injuryNotes: z.string().optional(),
  dietaryStyle: z.string().optional(),
  allergies: z.string().optional(),
  dislikes: z.string().optional(),
  cookingTime: CookingTimeSchema.optional(),
  mealsPerDay: z.number().int().min(2).max(5).optional(),
});

export async function upsertProfile(userId: string, body: unknown) {
  const parsed = ProfileBody.safeParse(body ?? {});
  if (!parsed.success) {
    return {
      status: 400 as const,
      body: { error: "INVALID_BODY", details: parsed.error.flatten() },
    };
  }

  const data = parsed.data;
  await prisma.userProfile.upsert({
    where: { userId },
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
      userId,
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

  return { status: 200 as const, body: { ok: true } };
}
