import { describe, test, expect, beforeEach, vi } from "vitest";
import { generatePlanFromApi } from "@/src/server/ai/agentWeeklyPlan";
import type { AIProvider } from "@/src/server/ai/provider";
import { trackEvent } from "@/src/server/lib/events";
import * as Sentry from "@sentry/nextjs";

vi.mock("@/src/server/lib/events", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

type ChatMessage = { role: "system" | "user"; content: string };

class StubProvider implements AIProvider {
  public lastMessages: ChatMessage[] = [];
  private reply: unknown;

  constructor(reply: unknown) {
    this.reply = reply;
  }

  async chat(messages: ChatMessage[], _opts?: { maxTokens?: number }) {
    void _opts;
    this.lastMessages = messages;
    return { content: JSON.stringify(this.reply) };
  }
}

function makeAllowedExercises(
  count: number,
  env: "GYM" | "HOME" | "CALISTHENICS" | "POOL" | "MIXED",
) {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(3, "0");
    return {
      slug: `ex-${n}`,
      name: `Ejercicio ${n}`,
      environment: env,
      primaryMuscle: "BACK", // mismo músculo => subset será top-N por slug
    };
  });
}

function makeNutritionWeek(mealsPerDay: 2 | 3 | 4) {
  const slotsByMeals: Record<number, Array<"breakfast" | "lunch" | "dinner" | "snack">> = {
    2: ["lunch", "dinner"],
    3: ["breakfast", "lunch", "dinner"],
    4: ["breakfast", "lunch", "dinner", "snack"],
  };

  const slots = slotsByMeals[mealsPerDay];

  return Array.from({ length: 7 }, (_, dayIndex) => ({
    dayIndex,
    meals: slots.map((slot) => ({
      slot,
      title: `Comida ${slot} día ${dayIndex}`,
      minutes: 10,
      tags: ["simple"],
      ingredients: ["ingrediente 1", "ingrediente 2"],
      instructions: "Mezcla y cocina de forma sencilla. Sirve y listo.",
      substitutions: [],
    })),
  }));
}

function makeValidAiReply(args: {
  environment: "GYM" | "HOME" | "CALISTHENICS" | "POOL" | "MIXED";
  daysPerWeek: number;
  sessionMinutes: number;
  mealsPerDay: 2 | 3 | 4;
  cookingTime: "MIN_10" | "MIN_20" | "MIN_40" | "FLEXIBLE";
  exercise: { slug: string; name: string };
}) {
  return {
    training: {
      environment: args.environment,
      daysPerWeek: args.daysPerWeek,
      sessionMinutes: args.sessionMinutes,
      sessions: [
        {
          dayIndex: 0,
          name: "Full body",
          exercises: [
            {
              slug: args.exercise.slug,
              name: args.exercise.name,
              sets: 2,
              reps: "8-10",
              restSec: 90,
            },
          ],
        },
      ],
    },
    nutrition: {
      mealsPerDay: args.mealsPerDay,
      cookingTime: args.cookingTime,
      days: makeNutritionWeek(args.mealsPerDay),
    },
  };
}

describe("generatePlanFromApi - guardrails regresión", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("1) allowedExercises grande => se recorta en el prompt y se trackea ai_allowed_exercises_trimmed", async () => {
    const allowedExercises = makeAllowedExercises(220, "GYM");
    const reply = makeValidAiReply({
      environment: "GYM",
      daysPerWeek: 1,
      sessionMinutes: 30,
      mealsPerDay: 3,
      cookingTime: "MIN_20",
      exercise: { slug: "ex-001", name: "Ejercicio 001" },
    });

    const provider = new StubProvider(reply);

    const res = await generatePlanFromApi(provider, {
      profile: {
        level: "BEGINNER",
        goal: "general fitness",
        injuryNotes: null,
        equipmentNotes: null,
        dietaryStyle: null,
        allergies: null,
        dislikes: null,
      },
      finalEnvironment: "GYM",
      finalDaysPerWeek: 1,
      finalSessionMinutes: 30,
      finalMealsPerDay: 3,
      finalCookingTime: "MIN_20",
      allowedExercises,
    });

    expect(res?.ok).toBe(true);

    // Track del trim
    expect(trackEvent).toHaveBeenCalledWith(
      "ai_allowed_exercises_trimmed",
      expect.objectContaining({ from: 220, to: 160, environment: "GYM" }),
    );

    // Validar que el userPrompt (JSON) lleva allowlist recortado
    const userMsg = provider.lastMessages.find((m) => m.role === "user");
    expect(userMsg).toBeTruthy();
    const userJson = JSON.parse(userMsg!.content) as { allowedExercises: Array<unknown> };
    expect(Array.isArray(userJson.allowedExercises)).toBe(true);
    expect(userJson.allowedExercises.length).toBe(160);
  });

  test("2) slug fuera del subset recortado pero existente en pool completo => NO fallback + track ai_slug_outside_prompt_allowlist", async () => {
    // 161 ejercicios => subset (160) será ex-001..ex-160; ex-161 queda fuera del allowlist del prompt
    const allowedExercises = makeAllowedExercises(161, "GYM");
    const outside = allowedExercises[160]; // ex-161

    const reply = makeValidAiReply({
      environment: "GYM",
      daysPerWeek: 1,
      sessionMinutes: 30,
      mealsPerDay: 3,
      cookingTime: "MIN_20",
      exercise: { slug: outside.slug, name: outside.name },
    });

    const provider = new StubProvider(reply);

    const res = await generatePlanFromApi(provider, {
      profile: {
        level: "BEGINNER",
        goal: "general fitness",
        injuryNotes: null,
        equipmentNotes: null,
        dietaryStyle: null,
        allergies: null,
        dislikes: null,
      },
      finalEnvironment: "GYM",
      finalDaysPerWeek: 1,
      finalSessionMinutes: 30,
      finalMealsPerDay: 3,
      finalCookingTime: "MIN_20",
      allowedExercises,
    });

    expect(res).not.toBeNull();

    // Debe trackear que el modelo usó un slug existente pero fuera del subset enviado
    expect(trackEvent).toHaveBeenCalledWith(
      "ai_slug_outside_prompt_allowlist",
      expect.objectContaining({
        count: 1,
        environment: "GYM",
        allowlistSize: 160,
        poolSize: 161,
      }),
    );
  });

  test("3) slug no existe en pool completo => fallback (null) + Sentry weekly_plan_fallback_ai_exercise_not_in_pool", async () => {
    const allowedExercises = makeAllowedExercises(50, "GYM");

    const reply = makeValidAiReply({
      environment: "GYM",
      daysPerWeek: 1,
      sessionMinutes: 30,
      mealsPerDay: 3,
      cookingTime: "MIN_20",
      exercise: { slug: "inventado-999", name: "Inventado" },
    });

    const provider = new StubProvider(reply);

    const res = await generatePlanFromApi(provider, {
      profile: {
        level: "BEGINNER",
        goal: "general fitness",
        injuryNotes: null,
        equipmentNotes: null,
        dietaryStyle: null,
        allergies: null,
        dislikes: null,
      },
      finalEnvironment: "GYM",
      finalDaysPerWeek: 1,
      finalSessionMinutes: 30,
      finalMealsPerDay: 3,
      finalCookingTime: "MIN_20",
      allowedExercises,
    });

    expect(res?.ok).toBe(false);
    expect(res?.reason).toBe("exercise_not_in_pool");
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "weekly_plan_fallback_ai_exercise_not_in_pool",
      expect.any(Object),
    );
  });
});
