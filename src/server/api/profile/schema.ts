import { z } from "zod";

const TrainingEnvironmentSchema = z.enum(["GYM", "HOME", "CALISTHENICS", "POOL", "MIXED"]);
const ActivityLevelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
const CookingTimeSchema = z.enum(["MIN_10", "MIN_20", "MIN_40", "FLEXIBLE"]);

export const ProfileInputSchema = z.object({
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

export type ProfileInput = z.infer<typeof ProfileInputSchema>;
