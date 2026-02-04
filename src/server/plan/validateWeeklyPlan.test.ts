import { describe, it, expect } from "vitest";
import {
  validateNutritionBeforePersist,
  validateTrainingBeforePersist,
  SUPPORTED_NUTRITION_SCHEMA_VERSION,
  SUPPORTED_TRAINING_SCHEMA_VERSION,
} from "./validateWeeklyPlan";

describe("validateNutritionBeforePersist", () => {
  const validLegacyPlan = {
    mealsPerDay: 3,
    cookingTime: "MIN_20",
    days: Array.from({ length: 7 }, (_, i) => ({
      dayIndex: i,
      meals: [
        {
          slot: "breakfast" as const,
          title: "Overnight oats",
          minutes: 10,
          tags: [],
          ingredients: ["avena", "yogur"],
          instructions: "Mezcla todo en un bol. Ajusta fruta y textura.",
          substitutions: [{ title: "Tostadas", minutes: 10 }],
        },
        {
          slot: "lunch" as const,
          title: "Tortilla francesa",
          minutes: 15,
          tags: [],
          ingredients: ["huevos", "ensalada"],
          instructions: "Haz la tortilla en sartén. Acompaña con ensalada.",
          substitutions: [{ title: "Revuelto", minutes: 15 }],
        },
        {
          slot: "dinner" as const,
          title: "Pollo a la plancha",
          minutes: 30,
          tags: [],
          ingredients: ["pollo", "arroz"],
          instructions: "Cocina arroz. Plancha pollo. Monta el plato.",
          substitutions: [{ title: "Atún", minutes: 15 }],
        },
      ],
    })),
  };

  it("accepts valid plan with schemaVersion 1", () => {
    const result = validateNutritionBeforePersist({
      ...validLegacyPlan,
      schemaVersion: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.normalized.schemaVersion).toBe(1);
  });

  it("accepts valid plan without schemaVersion (legacy compat)", () => {
    const result = validateNutritionBeforePersist(validLegacyPlan);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.normalized.schemaVersion).toBe(1);
  });

  it("rejects plan with unsupported schemaVersion", () => {
    const result = validateNutritionBeforePersist({
      ...validLegacyPlan,
      schemaVersion: 2,
    });
    expect(result).toEqual({ ok: false, reason: "unsupported_schema_version" });
  });

  it("rejects plan with schemaVersion 0", () => {
    const result = validateNutritionBeforePersist({
      ...validLegacyPlan,
      schemaVersion: 0,
    });
    expect(result).toEqual({ ok: false, reason: "unsupported_schema_version" });
  });

  it("SUPPORTED_NUTRITION_SCHEMA_VERSION is 1", () => {
    expect(SUPPORTED_NUTRITION_SCHEMA_VERSION).toBe(1);
  });
});

const oneSessionOneExercise = {
  dayIndex: 0,
  name: "Session 1",
  exercises: [{ slug: "ex-001", sets: 3 }],
};

const validTrainingMinimal = {
  sessions: [oneSessionOneExercise],
};

describe("validateTrainingBeforePersist", () => {
  it("accepts training with schemaVersion 1 and returns normalized", () => {
    const result = validateTrainingBeforePersist({
      ...validTrainingMinimal,
      schemaVersion: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized.schemaVersion).toBe(1);
      expect(result.normalized.sessions).toHaveLength(1);
    }
  });

  it("accepts training without schemaVersion (legacy compat) and normalizes to 1", () => {
    const result = validateTrainingBeforePersist(validTrainingMinimal);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.normalized.schemaVersion).toBe(1);
  });

  it("rejects training with unsupported schemaVersion", () => {
    expect(validateTrainingBeforePersist({ ...validTrainingMinimal, schemaVersion: 2 })).toEqual({
      ok: false,
      reason: "unsupported_schema_version",
    });
  });

  it("returns invalid_shape for empty object", () => {
    const vt = validateTrainingBeforePersist({});
    expect(vt.ok).toBe(false);
    if (!vt.ok) expect(vt.reason).toBe("invalid_shape");
  });

  it("returns invalid_shape for empty sessions", () => {
    const vt = validateTrainingBeforePersist({ sessions: [] });
    expect(vt.ok).toBe(false);
    if (!vt.ok) expect(vt.reason).toBe("invalid_shape");
  });

  it("accepts training with extra fields (passthrough)", () => {
    const result = validateTrainingBeforePersist({
      ...validTrainingMinimal,
      environment: "GYM",
      extraField: "ignored",
      sessions: [{ ...oneSessionOneExercise, customFlag: true }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result.normalized as Record<string, unknown>).extraField).toBe("ignored");
    }
  });

  it("SUPPORTED_TRAINING_SCHEMA_VERSION is 1", () => {
    expect(SUPPORTED_TRAINING_SCHEMA_VERSION).toBe(1);
  });
});
