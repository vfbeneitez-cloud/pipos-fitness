import { prisma } from "@/src/server/db/prisma";
import type { ProfileInput } from "./schema";

export async function getProfile(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });
  return profile;
}

export async function upsertProfile(userId: string, input: ProfileInput) {
  const profile = await prisma.userProfile.upsert({
    where: { userId },
    update: {
      goal: input.goal ?? undefined,
      level: input.level ?? undefined,
      daysPerWeek: input.daysPerWeek ?? undefined,
      sessionMinutes: input.sessionMinutes ?? undefined,
      environment: input.environment ?? undefined,
      equipmentNotes: input.equipmentNotes ?? undefined,
      injuryNotes: input.injuryNotes ?? undefined,
      dietaryStyle: input.dietaryStyle ?? undefined,
      allergies: input.allergies ?? undefined,
      dislikes: input.dislikes ?? undefined,
      cookingTime: input.cookingTime ?? undefined,
      mealsPerDay: input.mealsPerDay ?? undefined,
    },
    create: {
      userId,
      goal: input.goal ?? null,
      level: input.level ?? "BEGINNER",
      daysPerWeek: input.daysPerWeek ?? 3,
      sessionMinutes: input.sessionMinutes ?? 45,
      environment: input.environment ?? "GYM",
      equipmentNotes: input.equipmentNotes ?? null,
      injuryNotes: input.injuryNotes ?? null,
      dietaryStyle: input.dietaryStyle ?? null,
      allergies: input.allergies ?? null,
      dislikes: input.dislikes ?? null,
      cookingTime: input.cookingTime ?? "MIN_20",
      mealsPerDay: input.mealsPerDay ?? 3,
    },
  });
  return profile;
}
