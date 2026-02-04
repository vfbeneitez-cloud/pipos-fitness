import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateWeeklyTrainingPlan } from "./generateWeeklyTrainingPlan";

function makePool(n: number, prefix: string): Array<{ slug: string; name: string }> {
  return Array.from({ length: n }, (_, i) => ({
    slug: `${prefix}-${i}`,
    name: `Exercise ${i}`,
  }));
}

describe("generateWeeklyTrainingPlan", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not repeat the same exercise across sessions when pool is large enough", () => {
    const pool = makePool(15, "ex");
    const plan = generateWeeklyTrainingPlan({
      environment: "GYM",
      daysPerWeek: 3,
      sessionMinutes: 45,
      exercisePool: pool,
    });
    const allSlugs = plan.sessions.flatMap((s) => s.exercises.map((e) => e.slug));
    const unique = new Set(allSlugs);
    expect(unique.size).toBe(allSlugs.length);
  });

  it("uses only exercises from the provided pool (environment filtering is caller responsibility)", () => {
    const pool = makePool(10, "gym-only");
    const plan = generateWeeklyTrainingPlan({
      environment: "GYM",
      daysPerWeek: 2,
      sessionMinutes: 45,
      exercisePool: pool,
    });
    const allSlugs = plan.sessions.flatMap((s) => s.exercises.map((e) => e.slug));
    const poolSlugs = new Set(pool.map((p) => p.slug));
    allSlugs.forEach((slug) => expect(poolSlugs.has(slug)).toBe(true));
  });

  it("alternates Session A / Session B when daysPerWeek >= 3 and pool has enough", () => {
    const pool = makePool(12, "ex");
    const plan = generateWeeklyTrainingPlan({
      environment: "HOME",
      daysPerWeek: 3,
      sessionMinutes: 45,
      exercisePool: pool,
    });
    expect(plan.sessions.length).toBe(3);
    expect(plan.sessions[0].name).toBe("Session A");
    expect(plan.sessions[1].name).toBe("Session B");
    expect(plan.sessions[2].name).toBe("Session A");
  });

  it("uses Session 1, 2... when daysPerWeek < 3", () => {
    const pool = makePool(10, "ex");
    const plan = generateWeeklyTrainingPlan({
      environment: "GYM",
      daysPerWeek: 2,
      sessionMinutes: 45,
      exercisePool: pool,
    });
    expect(plan.sessions[0].name).toBe("Session 1");
    expect(plan.sessions[1].name).toBe("Session 2");
  });

  it("returns plan with schemaVersion 1", () => {
    const pool = makePool(6, "ex");
    const plan = generateWeeklyTrainingPlan({
      environment: "GYM",
      daysPerWeek: 2,
      sessionMinutes: 45,
      exercisePool: pool,
    });
    expect(plan.schemaVersion).toBe(1);
  });
});
