import { describe, it, expect } from "vitest";
import { computeStreak, getWeeklyNudge } from "./goals";

describe("computeStreak", () => {
  it("basic streak: 3 consecutive weeks >= goal", () => {
    const items = [
      { weekStart: "2026-01-27", totalPercent: 80 },
      { weekStart: "2026-01-20", totalPercent: 75 },
      { weekStart: "2026-01-13", totalPercent: 70 },
    ];
    const streak = computeStreak(items, 70);
    expect(streak.currentStreakWeeks).toBe(3);
    expect(streak.bestStreakWeeks).toBe(3);
  });

  it("streak broken: gap in middle", () => {
    const items = [
      { weekStart: "2026-01-27", totalPercent: 80 },
      { weekStart: "2026-01-20", totalPercent: 65 },
      { weekStart: "2026-01-13", totalPercent: 75 },
    ];
    const streak = computeStreak(items, 70);
    expect(streak.currentStreakWeeks).toBe(1);
    expect(streak.bestStreakWeeks).toBe(1);
  });

  it("no streak when first week below goal", () => {
    const items = [
      { weekStart: "2026-01-27", totalPercent: 50 },
      { weekStart: "2026-01-20", totalPercent: 80 },
    ];
    const streak = computeStreak(items, 70);
    expect(streak.currentStreakWeeks).toBe(0);
    expect(streak.bestStreakWeeks).toBe(1);
  });

  it("empty items", () => {
    const streak = computeStreak([], 70);
    expect(streak.currentStreakWeeks).toBe(0);
    expect(streak.bestStreakWeeks).toBeUndefined();
  });
});

describe("getWeeklyNudge", () => {
  it("ON_TRACK when currentWeekPercent >= goal", () => {
    const nudge = getWeeklyNudge({
      currentWeekPercent: 85,
      goalPercent: 70,
      currentStreakWeeks: 1,
    });
    expect(nudge.type).toBe("ON_TRACK");
    expect(nudge.severity).toBe("low");
  });

  it("NEW_STREAK when streak >= 2 and increased vs prev", () => {
    const nudge = getWeeklyNudge({
      currentWeekPercent: 80,
      goalPercent: 70,
      currentStreakWeeks: 2,
      previousStreakWeeks: 1,
    });
    expect(nudge.type).toBe("NEW_STREAK");
    expect(nudge.severity).toBe("low");
  });

  it("STREAK_BROKEN when prev streak >= 2 and now 0", () => {
    const nudge = getWeeklyNudge({
      currentWeekPercent: 50,
      goalPercent: 70,
      currentStreakWeeks: 0,
      previousStreakWeeks: 2,
    });
    expect(nudge.type).toBe("STREAK_BROKEN");
    expect(nudge.severity).toBe("medium");
  });

  it("BEHIND_GOAL high when gap >= 20", () => {
    const nudge = getWeeklyNudge({
      currentWeekPercent: 45,
      goalPercent: 70,
      currentStreakWeeks: 0,
    });
    expect(nudge.type).toBe("BEHIND_GOAL");
    expect(nudge.severity).toBe("high");
  });

  it("BEHIND_GOAL medium when gap < 20", () => {
    const nudge = getWeeklyNudge({
      currentWeekPercent: 65,
      goalPercent: 70,
      currentStreakWeeks: 0,
    });
    expect(nudge.type).toBe("BEHIND_GOAL");
    expect(nudge.severity).toBe("medium");
  });
});
