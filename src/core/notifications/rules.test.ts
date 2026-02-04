import { describe, it, expect } from "vitest";
import { buildDailyNotificationCandidates } from "./rules";

describe("buildDailyNotificationCandidates", () => {
  const base = {
    today: new Date("2026-02-04T12:00:00.000Z"),
    weekStart: "2026-02-03",
    goalPercent: 70,
    nudge: { type: "ON_TRACK" as const },
    currentWeekPercent: 50,
    todayPlannedSessionExists: false,
    todayTrainingCompleted: false,
  };

  it("returns WEEK_BEHIND_GOAL when nudge BEHIND_GOAL and percent < goal", () => {
    const out = buildDailyNotificationCandidates({
      ...base,
      nudge: { type: "BEHIND_GOAL" },
    });
    const c = out.find((x) => x.type === "WEEK_BEHIND_GOAL");
    expect(c).toBeDefined();
    expect(c!.scopeKey).toBe("week:2026-02-03");
  });

  it("no WEEK_BEHIND_GOAL when percent >= goal", () => {
    const out = buildDailyNotificationCandidates({
      ...base,
      currentWeekPercent: 75,
      nudge: { type: "BEHIND_GOAL" },
    });
    expect(out.find((x) => x.type === "WEEK_BEHIND_GOAL")).toBeUndefined();
  });

  it("returns STREAK_BROKEN when nudge STREAK_BROKEN", () => {
    const out = buildDailyNotificationCandidates({
      ...base,
      nudge: { type: "STREAK_BROKEN" },
    });
    const c = out.find((x) => x.type === "STREAK_BROKEN");
    expect(c).toBeDefined();
    expect(c!.scopeKey).toBe("week:2026-02-03");
  });

  it("returns TODAY_TRAINING_REMINDER when session planned and not completed", () => {
    const out = buildDailyNotificationCandidates({
      ...base,
      nudge: { type: "ON_TRACK" },
      todayPlannedSessionExists: true,
      todayTrainingCompleted: false,
    });
    const c = out.find((x) => x.type === "TODAY_TRAINING_REMINDER");
    expect(c).toBeDefined();
    expect(c!.scopeKey).toBe("day:2026-02-04");
  });

  it("no TODAY_TRAINING_REMINDER when already completed", () => {
    const out = buildDailyNotificationCandidates({
      ...base,
      todayPlannedSessionExists: true,
      todayTrainingCompleted: true,
    });
    expect(out.find((x) => x.type === "TODAY_TRAINING_REMINDER")).toBeUndefined();
  });

  it("no TODAY_TRAINING_REMINDER when no session planned", () => {
    const out = buildDailyNotificationCandidates({
      ...base,
      nudge: { type: "ON_TRACK" },
      todayPlannedSessionExists: false,
    });
    expect(out.find((x) => x.type === "TODAY_TRAINING_REMINDER")).toBeUndefined();
  });

  it("max 2 candidates per day", () => {
    const out = buildDailyNotificationCandidates({
      ...base,
      nudge: { type: "STREAK_BROKEN" },
      todayPlannedSessionExists: true,
      todayTrainingCompleted: false,
    });
    expect(out.length).toBeLessThanOrEqual(2);
  });

  it("orders by priority: TODAY_TRAINING before WEEK_BEHIND_GOAL", () => {
    const out = buildDailyNotificationCandidates({
      ...base,
      nudge: { type: "BEHIND_GOAL" },
      todayPlannedSessionExists: true,
      todayTrainingCompleted: false,
    });
    const types = out.map((x) => x.type);
    const idxTraining = types.indexOf("TODAY_TRAINING_REMINDER");
    const idxBehind = types.indexOf("WEEK_BEHIND_GOAL");
    if (idxTraining >= 0 && idxBehind >= 0) {
      expect(idxTraining).toBeLessThan(idxBehind);
    }
  });

  it("no WEEK_BEHIND_GOAL when currentWeekPercent is null", () => {
    const out = buildDailyNotificationCandidates({
      ...base,
      currentWeekPercent: null,
      nudge: { type: "BEHIND_GOAL" },
    });
    expect(out.find((x) => x.type === "WEEK_BEHIND_GOAL")).toBeUndefined();
  });
});
