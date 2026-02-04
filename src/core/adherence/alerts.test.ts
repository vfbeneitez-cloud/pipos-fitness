import { describe, it, expect } from "vitest";
import { getAdherenceAlerts } from "./alerts";

describe("getAdherenceAlerts", () => {
  it("returns empty for empty items", () => {
    expect(getAdherenceAlerts([])).toEqual([]);
  });

  it("LOW_ADHERENCE_STREAK when 2 consecutive weeks < 60", () => {
    const items = [
      { weekStart: "2026-01-27", totalPercent: 55, trainingPercent: 60, nutritionPercent: 50 },
      { weekStart: "2026-01-20", totalPercent: 45, trainingPercent: 50, nutritionPercent: 40 },
    ];
    const alerts = getAdherenceAlerts(items);
    const streak = alerts.find((a) => a.type === "LOW_ADHERENCE_STREAK");
    expect(streak).toBeDefined();
    expect(streak!.severity).toBe("high");
    expect(streak!.weeks).toEqual(["2026-01-20", "2026-01-27"]);
  });

  it("LOW_ADHERENCE_STREAK mentions 3 weeks when 3 consecutive", () => {
    const items = [
      { weekStart: "2026-01-27", totalPercent: 50, trainingPercent: 50, nutritionPercent: 50 },
      { weekStart: "2026-01-20", totalPercent: 45, trainingPercent: 45, nutritionPercent: 45 },
      { weekStart: "2026-01-13", totalPercent: 40, trainingPercent: 40, nutritionPercent: 40 },
    ];
    const alerts = getAdherenceAlerts(items);
    const streak = alerts.find((a) => a.type === "LOW_ADHERENCE_STREAK");
    expect(streak).toBeDefined();
    expect(streak!.title).toContain("3 semanas");
  });

  it("NUTRITION_DROP when nutrition <= training - 20 and nutrition < 60", () => {
    const items = [
      { weekStart: "2026-01-27", totalPercent: 50, trainingPercent: 80, nutritionPercent: 20 },
    ];
    const alerts = getAdherenceAlerts(items);
    const drop = alerts.find((a) => a.type === "NUTRITION_DROP");
    expect(drop).toBeDefined();
    expect(drop!.severity).toBe("high");
  });

  it("NUTRITION_DROP medium when nutrition 40-60 and gap >= 20", () => {
    const items = [
      { weekStart: "2026-01-27", totalPercent: 55, trainingPercent: 75, nutritionPercent: 50 },
    ];
    const alerts = getAdherenceAlerts(items);
    const drop = alerts.find((a) => a.type === "NUTRITION_DROP");
    expect(drop).toBeDefined();
    expect(drop!.severity).toBe("medium");
  });

  it("IMPROVING_TREND when totalPercent up >= 10 vs prev", () => {
    const items = [
      { weekStart: "2026-01-27", totalPercent: 85, trainingPercent: 90, nutritionPercent: 80 },
      { weekStart: "2026-01-20", totalPercent: 70, trainingPercent: 75, nutritionPercent: 65 },
    ];
    const alerts = getAdherenceAlerts(items);
    const improving = alerts.find((a) => a.type === "IMPROVING_TREND");
    expect(improving).toBeDefined();
    expect(improving!.severity).toBe("low");
  });

  it("no PLAN_TOO_AMBITIOUS_TREND when LOW_ADHERENCE_STREAK already covers same weeks", () => {
    const items = [
      { weekStart: "2026-01-27", totalPercent: 45, trainingPercent: 50, nutritionPercent: 40 },
      { weekStart: "2026-01-20", totalPercent: 40, trainingPercent: 45, nutritionPercent: 35 },
    ];
    const alerts = getAdherenceAlerts(items);
    const streak = alerts.find((a) => a.type === "LOW_ADHERENCE_STREAK");
    const ambitious = alerts.find((a) => a.type === "PLAN_TOO_AMBITIOUS_TREND");
    expect(streak).toBeDefined();
    expect(ambitious).toBeUndefined();
  });

  it("returns max 3 alerts", () => {
    const items = [
      { weekStart: "2026-01-27", totalPercent: 30, trainingPercent: 90, nutritionPercent: 10 },
      { weekStart: "2026-01-20", totalPercent: 25, trainingPercent: 85, nutritionPercent: 5 },
    ];
    const alerts = getAdherenceAlerts(items);
    expect(alerts.length).toBeLessThanOrEqual(3);
  });

  it("orders by severity high -> medium -> low", () => {
    const items = [
      { weekStart: "2026-01-27", totalPercent: 85, trainingPercent: 90, nutritionPercent: 80 },
      { weekStart: "2026-01-20", totalPercent: 70, trainingPercent: 75, nutritionPercent: 65 },
      { weekStart: "2026-01-13", totalPercent: 55, trainingPercent: 60, nutritionPercent: 50 },
    ];
    const alerts = getAdherenceAlerts(items);
    const severities = alerts.map((a) => a.severity);
    for (let i = 1; i < severities.length; i++) {
      const prev = severities[i - 1];
      const curr = severities[i];
      const order = { high: 0, medium: 1, low: 2 };
      expect(order[curr]).toBeGreaterThanOrEqual(order[prev]);
    }
  });
});
