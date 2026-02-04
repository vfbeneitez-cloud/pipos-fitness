import { describe, it, expect } from "vitest";
import { getWeeklyAdherenceInsights } from "./insights";
import { computeWeeklyAdherence } from "./computeWeeklyAdherence";

const WEEK_START = new Date("2026-02-02T00:00:00.000Z");

function makeBreakdown(
  training: { planned: number; completed: number; percent: number },
  nutrition: { planned: number; completed: number; percent: number },
  totalPercent: number,
) {
  return { training, nutrition, totalPercent };
}

describe("getWeeklyAdherenceInsights", () => {
  it("total >= 85 -> nextAction KEEP_GOING", () => {
    const breakdown = makeBreakdown(
      { planned: 3, completed: 3, percent: 100 },
      { planned: 21, completed: 20, percent: 95 },
      92,
    );
    const result = getWeeklyAdherenceInsights(
      {
        breakdown,
        plan: {
          sessions: [{ dayIndex: 0 }, { dayIndex: 2 }, { dayIndex: 4 }],
          days: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, meals: [{}, {}, {}] })),
          mealsPerDay: 3,
        },
        trainingLogs: [],
        nutritionLogs: [],
        weekStart: WEEK_START,
      },
    );
    expect(result.nextAction.type).toBe("KEEP_GOING");
  });

  it("training < 50 con plannedTraining >= 4 -> nextAction REDUCE_DAYS_PER_WEEK", () => {
    const breakdown = makeBreakdown(
      { planned: 5, completed: 1, percent: 20 },
      { planned: 21, completed: 10, percent: 48 },
      42,
    );
    const result = getWeeklyAdherenceInsights(
      {
        breakdown,
        plan: {
          sessions: [
            { dayIndex: 0 },
            { dayIndex: 1 },
            { dayIndex: 2 },
            { dayIndex: 3 },
            { dayIndex: 4 },
          ],
          days: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, meals: [{}, {}, {}] })),
          mealsPerDay: 3,
        },
        trainingLogs: [],
        nutritionLogs: [],
        weekStart: WEEK_START,
      },
    );
    expect(result.nextAction.type).toBe("REDUCE_DAYS_PER_WEEK");
    expect(result.insights.some((i) => i.type === "TRAINING_LOW_ADHERENCE" && i.severity === "high")).toBe(true);
  });

  it("nutrition < 50 con mealsPerDay >= 4 -> nextAction REDUCE_MEALS_PER_DAY", () => {
    const breakdown = makeBreakdown(
      { planned: 3, completed: 3, percent: 100 },
      { planned: 28, completed: 10, percent: 36 },
      45,
    );
    const result = getWeeklyAdherenceInsights(
      {
        breakdown,
        plan: {
          sessions: [{ dayIndex: 0 }, { dayIndex: 2 }, { dayIndex: 4 }],
          days: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, meals: [{}, {}, {}, {}] })),
          mealsPerDay: 4,
        },
        trainingLogs: [],
        nutritionLogs: [],
        weekStart: WEEK_START,
      },
    );
    expect(result.nextAction.type).toBe("REDUCE_MEALS_PER_DAY");
    expect(result.insights.some((i) => i.type === "NUTRITION_LOW_ADHERENCE" && i.severity === "high")).toBe(true);
  });

  it("plan too ambitious: plannedTraining >= 5 y trainingPercent < 60 -> PLAN_TOO_AMBITIOUS", () => {
    const breakdown = makeBreakdown(
      { planned: 5, completed: 2, percent: 40 },
      { planned: 21, completed: 21, percent: 100 },
      72,
    );
    const result = getWeeklyAdherenceInsights(
      {
        breakdown,
        plan: {
          sessions: Array.from({ length: 5 }, (_, i) => ({ dayIndex: i })),
          days: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, meals: [{}, {}, {}] })),
          mealsPerDay: 3,
        },
        trainingLogs: [],
        nutritionLogs: [],
        weekStart: WEEK_START,
      },
    );
    expect(result.insights.some((i) => i.type === "PLAN_TOO_AMBITIOUS")).toBe(true);
  });

  it("plan too ambitious: plannedMeals >= 28 y nutritionPercent < 60 -> PLAN_TOO_AMBITIOUS", () => {
    const breakdown = makeBreakdown(
      { planned: 3, completed: 3, percent: 100 },
      { planned: 28, completed: 14, percent: 50 },
      68,
    );
    const result = getWeeklyAdherenceInsights(
      {
        breakdown,
        plan: {
          sessions: [{ dayIndex: 0 }, { dayIndex: 2 }, { dayIndex: 4 }],
          days: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, meals: [{}, {}, {}, {}] })),
          mealsPerDay: 4,
        },
        trainingLogs: [],
        nutritionLogs: [],
        weekStart: WEEK_START,
      },
    );
    expect(result.insights.some((i) => i.type === "PLAN_TOO_AMBITIOUS")).toBe(true);
  });

  it("max 3 insights", () => {
    const breakdown = makeBreakdown(
      { planned: 5, completed: 1, percent: 20 },
      { planned: 28, completed: 5, percent: 18 },
      18,
    );
    const result = getWeeklyAdherenceInsights(
      {
        breakdown,
        plan: {
          sessions: Array.from({ length: 5 }, (_, i) => ({ dayIndex: i })),
          days: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, meals: [{}, {}, {}, {}] })),
          mealsPerDay: 4,
        },
        trainingLogs: [],
        nutritionLogs: [],
        weekStart: WEEK_START,
      },
    );
    expect(result.insights.length).toBeLessThanOrEqual(3);
  });
});
