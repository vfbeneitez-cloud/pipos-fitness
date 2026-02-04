import { describe, it, expect } from "vitest";
import { computeInputShapeHash } from "./adherenceCoach";
import type { DeterministicInsightPayload } from "./adherenceCoach";

function basePayload(): DeterministicInsightPayload {
  return {
    weekStart: "2026-02-03",
    trainingPlan: { environment: "GYM", daysPerWeek: 3, sessionMinutes: 45 },
    nutritionPlan: { mealsPerDay: 3, cookingTime: "MIN_20" },
    breakdown: {
      training: { planned: 3, completed: 2, percent: 67 },
      nutrition: { planned: 21, completed: 6, percent: 29 },
      totalPercent: 41,
    },
    insights: [
      { type: "TRAINING_LOW_ADHERENCE", severity: "high", title: "t1", detail: "d1" },
      { type: "NUTRITION_LOW_ADHERENCE", severity: "high", title: "t2", detail: "d2" },
    ],
    nextAction: { type: "REDUCE_MEALS_PER_DAY", title: "na", detail: "nad" },
  };
}

describe("computeInputShapeHash", () => {
  it("ignores titles/details", () => {
    const a = basePayload();
    const b = basePayload();
    b.insights = b.insights.map((i) => ({
      ...i,
      title: i.title + " changed",
      detail: i.detail + " changed",
    }));
    b.nextAction = { ...b.nextAction, title: "changed", detail: "changed" };

    expect(computeInputShapeHash(a)).toBe(computeInputShapeHash(b));
  });

  it("changes when numbers/enums change", () => {
    const a = basePayload();
    const b = basePayload();
    b.breakdown.totalPercent = 42;

    expect(computeInputShapeHash(a)).not.toBe(computeInputShapeHash(b));
  });
});
