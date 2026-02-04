import { describe, it, expect } from "vitest";
import { computeWeeklyAdherence } from "./computeWeeklyAdherence";

/** Monday 2026-02-02 00:00 UTC */
const WEEK_START = new Date("2026-02-02T00:00:00.000Z");

describe("computeWeeklyAdherence", () => {
  it("sin logs -> 0%", () => {
    const trainingPlan = { sessions: [{ dayIndex: 0 }, { dayIndex: 2 }, { dayIndex: 4 }] };
    const nutritionPlan = {
      days: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, meals: [{}, {}, {}] })),
      mealsPerDay: 3,
    };
    const result = computeWeeklyAdherence(trainingPlan, nutritionPlan, [], [], WEEK_START);
    expect(result.training.percent).toBe(0);
    expect(result.nutrition.percent).toBe(0);
    expect(result.totalPercent).toBe(0);
  });

  it("plan con 3 sesiones, 2 logs completed -> ~66% training", () => {
    const trainingPlan = { sessions: [{ dayIndex: 0 }, { dayIndex: 2 }, { dayIndex: 4 }] };
    const nutritionPlan = { days: [], mealsPerDay: 0 };
    const logs = [
      { occurredAt: "2026-02-02T10:00:00.000Z", completed: true },
      { occurredAt: "2026-02-04T10:00:00.000Z", completed: true },
    ];
    const result = computeWeeklyAdherence(trainingPlan, nutritionPlan, logs, [], WEEK_START);
    expect(result.training.planned).toBe(3);
    expect(result.training.completed).toBe(2);
    expect(result.training.percent).toBe(67);
  });

  it("dedupe: 2 logs mismo dayIndex -> cuenta 1", () => {
    const trainingPlan = { sessions: [{ dayIndex: 0 }, { dayIndex: 2 }] };
    const nutritionPlan = { days: [], mealsPerDay: 0 };
    const logs = [
      { occurredAt: "2026-02-02T08:00:00.000Z", completed: true },
      { occurredAt: "2026-02-02T18:00:00.000Z", completed: true },
    ];
    const result = computeWeeklyAdherence(trainingPlan, nutritionPlan, logs, [], WEEK_START);
    expect(result.training.completed).toBe(1);
  });

  it("nutrition: plan 7*3=21 planned, 2 días con 3 logs followedPlan=true → completed 6 → 29%", () => {
    const trainingPlan = { sessions: [] };
    const nutritionPlan = {
      days: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, meals: [{}, {}, {}] })),
      mealsPerDay: 3,
    };
    const nutritionLogs = [
      { occurredAt: "2026-02-02T09:00:00.000Z", followedPlan: true },
      { occurredAt: "2026-02-02T14:00:00.000Z", followedPlan: true },
      { occurredAt: "2026-02-02T20:00:00.000Z", followedPlan: true },
      { occurredAt: "2026-02-03T09:00:00.000Z", followedPlan: true },
      { occurredAt: "2026-02-03T14:00:00.000Z", followedPlan: true },
      { occurredAt: "2026-02-03T20:00:00.000Z", followedPlan: true },
    ];
    const result = computeWeeklyAdherence(
      trainingPlan,
      nutritionPlan,
      [],
      nutritionLogs,
      WEEK_START,
    );
    expect(result.nutrition.planned).toBe(21);
    expect(result.nutrition.completed).toBe(6);
    expect(result.nutrition.percent).toBe(29);
  });

  it("nutrition: logs con followedPlan=false no cuentan", () => {
    const trainingPlan = { sessions: [] };
    const nutritionPlan = {
      days: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, meals: [{}, {}, {}] })),
      mealsPerDay: 3,
    };
    const nutritionLogs = [
      { occurredAt: "2026-02-02T09:00:00.000Z", followedPlan: false },
      { occurredAt: "2026-02-02T14:00:00.000Z", followedPlan: false },
    ];
    const result = computeWeeklyAdherence(
      trainingPlan,
      nutritionPlan,
      [],
      nutritionLogs,
      WEEK_START,
    );
    expect(result.nutrition.planned).toBe(21);
    expect(result.nutrition.completed).toBe(0);
  });

  it("nutrition: 5 logs en un día followedPlan=true con mealsPerDay=3 → cuenta 3 (cap)", () => {
    const trainingPlan = { sessions: [] };
    const nutritionPlan = {
      days: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, meals: [{}, {}, {}] })),
      mealsPerDay: 3,
    };
    const nutritionLogs = [
      { occurredAt: "2026-02-02T08:00:00.000Z", followedPlan: true },
      { occurredAt: "2026-02-02T10:00:00.000Z", followedPlan: true },
      { occurredAt: "2026-02-02T14:00:00.000Z", followedPlan: true },
      { occurredAt: "2026-02-02T16:00:00.000Z", followedPlan: true },
      { occurredAt: "2026-02-02T20:00:00.000Z", followedPlan: true },
    ];
    const result = computeWeeklyAdherence(
      trainingPlan,
      nutritionPlan,
      [],
      nutritionLogs,
      WEEK_START,
    );
    expect(result.nutrition.planned).toBe(21);
    expect(result.nutrition.completed).toBe(3);
  });

  it("logs fuera de rango no cuentan", () => {
    const trainingPlan = { sessions: [{ dayIndex: 0 }] };
    const nutritionPlan = { days: [], mealsPerDay: 0 };
    const logs = [
      { occurredAt: "2026-02-01T23:59:59.999Z", completed: true },
      { occurredAt: "2026-02-09T00:00:00.000Z", completed: true },
    ];
    const result = computeWeeklyAdherence(trainingPlan, nutritionPlan, logs, [], WEEK_START);
    expect(result.training.completed).toBe(0);
  });

  it("logs con completed=false no cuentan", () => {
    const trainingPlan = { sessions: [{ dayIndex: 0 }] };
    const nutritionPlan = { days: [], mealsPerDay: 0 };
    const logs = [{ occurredAt: "2026-02-02T10:00:00.000Z", completed: false }];
    const result = computeWeeklyAdherence(trainingPlan, nutritionPlan, logs, [], WEEK_START);
    expect(result.training.completed).toBe(0);
  });
});
