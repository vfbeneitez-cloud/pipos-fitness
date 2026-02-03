/**
 * Generador de planes de entrenamiento y nutrición usando OpenAI
 * - Prompts con ejemplos concretos
 * - Validación robusta
 * - Manejo de errores claro
 */

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { OpenAIClient } from "./openaiClient";
import type {
  WeeklyTrainingPlan,
  TrainingSession,
} from "@/src/core/training/generateWeeklyTrainingPlan";
import type { WeeklyNutritionPlan, Meal } from "@/src/core/nutrition/generateWeeklyNutritionPlan";

// Schema para validar la respuesta de OpenAI
const TrainingSchema = z.object({
  environment: z.enum(["GYM", "HOME", "CALISTHENICS", "POOL", "MIXED"]),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionMinutes: z.number().int().min(15).max(180),
  sessions: z.array(
    z.object({
      dayIndex: z.number().int().min(0).max(6),
      name: z.string().min(1),
      exercises: z
        .array(
          z.object({
            slug: z.string().min(1),
            name: z.string().min(1),
            sets: z.number().int().min(1).max(10),
            reps: z.string().min(1),
            restSec: z.number().int().min(0).max(300),
          }),
        )
        .min(1),
    }),
  ),
});

const NutritionSchema = z.object({
  mealsPerDay: z.number().int().min(2).max(4),
  cookingTime: z.enum(["MIN_10", "MIN_20", "MIN_40", "FLEXIBLE"]),
  days: z.array(
    z.object({
      dayIndex: z.number().int().min(0).max(6),
      meals: z
        .array(
          z.object({
            slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
            title: z.string().min(10), // Evitar placeholders cortos
            minutes: z.number().int().min(5).max(120),
            tags: z.array(z.string()).default([]),
            ingredients: z.array(z.string()).min(2), // Mínimo 2 ingredientes
            instructions: z.string().min(20), // Instrucciones mínimas
            substitutions: z
              .array(z.object({ title: z.string(), minutes: z.number() }))
              .default([]),
          }),
        )
        .min(1),
    }),
  ),
});

const PlanSchema = z.object({
  training: TrainingSchema,
  nutrition: NutritionSchema,
});

export interface PlanGeneratorInput {
  // Usuario
  userId: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  goal?: string;
  injuryNotes?: string;
  equipmentNotes?: string;

  // Training
  environment: "GYM" | "HOME" | "CALISTHENICS" | "POOL" | "MIXED";
  daysPerWeek: number;
  sessionMinutes: number;
  trainingDayIndices: number[]; // Ej: [0,2,4] para lunes/miércoles/viernes
  allowedExercises: Array<{ slug: string; name: string; environment: string }>;

  // Nutrition
  mealsPerDay: number;
  cookingTime: "MIN_10" | "MIN_20" | "MIN_40" | "FLEXIBLE";
  dietaryStyle?: string;
  allergies?: string;
  dislikes?: string;
}

export interface PlanGeneratorOutput {
  training: WeeklyTrainingPlan;
  nutrition: WeeklyNutritionPlan;
  exercisesUsed: Array<{ slug: string; name: string; environment: string }>;
}

function buildSystemPrompt(): string {
  return `Eres un asistente experto en fitness y nutrición. Tu trabajo es generar planes semanales personalizados.

REGLAS IMPORTANTES:
1. **Training**:
   - Usa SOLO ejercicios de la lista allowedExercises proporcionada
   - Usa EXACTAMENTE los dayIndex especificados en trainingDayIndices
   - Para principiantes: 2-3 sets, volumen moderado
   - Para intermedios/avanzados: 3-4 sets, mayor volumen

2. **Nutrition**:
   - Genera comidas COMPLETAS con título descriptivo (NO uses placeholders como "B", "L", "D")
   - Mínimo 2 ingredientes por comida
   - Instrucciones claras (mínimo 20 caracteres)
   - Respeta alergias y preferencias dietéticas
   - Para cada comida, incluye 1 sustitución alternativa

3. **Formato**: Responde SOLO con JSON válido (sin markdown, sin texto adicional)

EJEMPLO DE RESPUESTA:
{
  "training": {
    "environment": "GYM",
    "daysPerWeek": 3,
    "sessionMinutes": 45,
    "sessions": [
      {
        "dayIndex": 0,
        "name": "Upper Body A",
        "exercises": [
          {
            "slug": "barbell-bench-press",
            "name": "Barbell Bench Press",
            "sets": 3,
            "reps": "8-12",
            "restSec": 90
          }
        ]
      }
    ]
  },
  "nutrition": {
    "mealsPerDay": 3,
    "cookingTime": "MIN_20",
    "days": [
      {
        "dayIndex": 0,
        "meals": [
          {
            "slot": "breakfast",
            "title": "Avena con plátano y mantequilla de maní",
            "minutes": 10,
            "tags": ["high-protein", "vegetarian"],
            "ingredients": ["avena", "plátano", "mantequilla de maní", "leche"],
            "instructions": "Cocina la avena con leche. Agrega plátano en rodajas y una cucharada de mantequilla de maní.",
            "substitutions": [
              {
                "title": "Tostadas integrales con queso fresco y fruta",
                "minutes": 10
              }
            ]
          }
        ]
      }
    ]
  }
}`;
}

function buildUserPrompt(input: PlanGeneratorInput): string {
  const exercisesList = input.allowedExercises
    .slice(0, 50) // Limitar a 50 ejercicios en el prompt
    .map((e) => `  - ${e.slug} (${e.name}, ${e.environment})`)
    .join("\n");

  return `Genera un plan semanal para:

**Usuario:**
- Nivel: ${input.level}
- Objetivo: ${input.goal || "fitness general"}
${input.injuryNotes ? `- Lesiones/limitaciones: ${input.injuryNotes}` : ""}
${input.equipmentNotes ? `- Equipo disponible: ${input.equipmentNotes}` : ""}

**Training:**
- Entorno: ${input.environment}
- Días por semana: ${input.daysPerWeek}
- Duración por sesión: ${input.sessionMinutes} minutos
- Entrenar estos días (dayIndex): ${input.trainingDayIndices.join(", ")}
- Ejercicios disponibles (usa SOLO estos):
${exercisesList}

**Nutrition:**
- Comidas por día: ${input.mealsPerDay}
- Tiempo de cocina: ${input.cookingTime}
${input.dietaryStyle ? `- Estilo dietético: ${input.dietaryStyle}` : ""}
${input.allergies ? `- Alergias: ${input.allergies}` : ""}
${input.dislikes ? `- No le gusta: ${input.dislikes}` : ""}

Genera 7 días completos (dayIndex 0-6) tanto para training como nutrition.`;
}

export class PlanGenerator {
  private client: OpenAIClient;

  constructor(apiKey: string) {
    this.client = new OpenAIClient(apiKey);
  }

  async generatePlan(input: PlanGeneratorInput): Promise<PlanGeneratorOutput | null> {
    try {
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(input);

      const response = await this.client.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 4000,
          timeoutMs: 20000,
        },
      );

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(response.content);
      } catch (parseError) {
        Sentry.captureMessage("OpenAI returned invalid JSON", {
          level: "warning",
          extra: { content: response.content.substring(0, 500), parseError },
        });
        return null;
      }

      // Validate with Zod
      const validation = PlanSchema.safeParse(parsed);
      if (!validation.success) {
        Sentry.captureMessage("OpenAI plan validation failed", {
          level: "warning",
          extra: {
            errors: validation.error.flatten(),
            parsed: JSON.stringify(parsed).substring(0, 500),
          },
        });
        return null;
      }

      const data = validation.data;

      // Validaciones adicionales
      // 1. Training sessions deben usar los dayIndices correctos
      const gotIndices = data.training.sessions.map((s) => s.dayIndex).sort();
      const expectedIndices = input.trainingDayIndices.sort();
      if (JSON.stringify(gotIndices) !== JSON.stringify(expectedIndices)) {
        Sentry.captureMessage("OpenAI used wrong dayIndices", {
          level: "warning",
          extra: { got: gotIndices, expected: expectedIndices },
        });
        return null;
      }

      // 2. Ejercicios deben estar en allowedExercises
      const allowedSlugs = new Set(input.allowedExercises.map((e) => e.slug.toLowerCase()));
      const allowedNames = new Set(input.allowedExercises.map((e) => e.name.toLowerCase().trim()));

      const exercisesUsed: Array<{ slug: string; name: string; environment: string }> = [];
      const seenSlugs = new Set<string>();

      for (const session of data.training.sessions) {
        for (const exercise of session.exercises) {
          const slugLower = exercise.slug.toLowerCase();
          const nameLower = exercise.name.toLowerCase().trim();

          // Verificar que existe en allowedExercises
          if (!allowedSlugs.has(slugLower) && !allowedNames.has(nameLower)) {
            Sentry.captureMessage("OpenAI used disallowed exercise", {
              level: "warning",
              extra: { slug: exercise.slug, name: exercise.name },
            });
            return null;
          }

          // Recopilar ejercicios únicos
          if (!seenSlugs.has(slugLower)) {
            seenSlugs.add(slugLower);
            exercisesUsed.push({
              slug: exercise.slug,
              name: exercise.name,
              environment: data.training.environment,
            });
          }
        }
      }

      // 3. Nutrition debe tener 7 días
      if (data.nutrition.days.length !== 7) {
        Sentry.captureMessage("OpenAI nutrition must have 7 days", {
          level: "warning",
          extra: { got: data.nutrition.days.length },
        });
        return null;
      }

      // 4. Verificar que no hay placeholders en nutrition
      for (const day of data.nutrition.days) {
        for (const meal of day.meals) {
          if (
            meal.title.length < 10 ||
            ["b", "l", "d", "s", "s1", "s2"].includes(meal.title.toLowerCase().trim())
          ) {
            Sentry.captureMessage("OpenAI nutrition has placeholder titles", {
              level: "warning",
              extra: { title: meal.title },
            });
            return null;
          }
        }
      }

      // Construir respuesta
      const trainingPlan: WeeklyTrainingPlan = {
        environment: data.training.environment,
        daysPerWeek: data.training.daysPerWeek,
        sessionMinutes: data.training.sessionMinutes,
        sessions: data.training.sessions as TrainingSession[],
      };

      const nutritionPlan: WeeklyNutritionPlan = {
        mealsPerDay: data.nutrition.mealsPerDay,
        cookingTime: data.nutrition.cookingTime,
        dietaryStyle: input.dietaryStyle || null,
        allergies: input.allergies || null,
        dislikes: input.dislikes || null,
        days: data.nutrition.days.map((d) => ({
          dayIndex: d.dayIndex,
          meals: d.meals as Meal[],
        })),
      };

      return {
        training: trainingPlan,
        nutrition: nutritionPlan,
        exercisesUsed,
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { context: "plan_generator" },
        extra: { userId: input.userId },
      });
      return null;
    }
  }
}
