import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/src/server/db/prisma";
import { main as seedMain } from "../../../prisma/seed";
import { adjustWeeklyPlan } from "./agentWeeklyPlan";

const TEST_USER_ID = "test-user-id";

vi.mock("@/src/server/auth/getSession", () => ({
  getUserIdFromSession: async () => TEST_USER_ID,
}));

describe("POST /api/agent/weekly-plan", () => {
  beforeEach(async () => {
    await prisma.user.upsert({
      where: { email: "test@local.test" },
      update: { id: TEST_USER_ID },
      create: { id: TEST_USER_ID, email: "test@local.test" },
    });
  });
  it("adjusts plan successfully based on adherence", async () => {
    await prisma.userProfile.upsert({
      where: { userId: TEST_USER_ID },
      update: {
        daysPerWeek: 3,
        sessionMinutes: 45,
        environment: "GYM",
        mealsPerDay: 3,
        cookingTime: "MIN_20",
      },
      create: {
        userId: TEST_USER_ID,
        daysPerWeek: 3,
        sessionMinutes: 45,
        environment: "GYM",
        mealsPerDay: 3,
        cookingTime: "MIN_20",
      },
    });

    await prisma.trainingLog.createMany({
      data: [
        { userId: TEST_USER_ID, completed: true, pain: false },
        { userId: TEST_USER_ID, completed: false, pain: false },
        { userId: TEST_USER_ID, completed: true, pain: false },
      ],
    });

    const result = await adjustWeeklyPlan(
      {
        weekStart: "2026-01-26",
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(200);
    const body = result.body as { plan: { id: string }; rationale: string };
    expect(body.plan).toBeDefined();
    expect(body.rationale).toBeDefined();
    expect(typeof body.rationale).toBe("string");

    const plan = await prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStart: {
          userId: TEST_USER_ID,
          weekStart: new Date("2026-01-26T00:00:00.000Z"),
        },
      },
    });
    expect(plan?.lastRationale).toBeDefined();
    expect(plan?.lastRationale?.length).toBeGreaterThan(0);
    expect(plan?.lastGeneratedAt).toBeDefined();
  });

  it("detects red flags and applies conservative adjustments", async () => {
    await prisma.userProfile.upsert({
      where: { userId: TEST_USER_ID },
      update: { daysPerWeek: 4, sessionMinutes: 60 },
      create: { userId: TEST_USER_ID, daysPerWeek: 4, sessionMinutes: 60 },
    });

    await prisma.trainingLog.create({
      data: {
        userId: TEST_USER_ID,
        completed: true,
        pain: true,
        painNotes: "dolor agudo en rodilla",
      },
    });

    const result = await adjustWeeklyPlan(
      {
        weekStart: "2026-01-26",
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(200);
    const body = result.body as { rationale: string };
    expect(body.rationale).toContain("profesional sanitario");
  });

  it("returns 400 for invalid body", async () => {
    const result = await adjustWeeklyPlan(
      {
        weekStart: "invalid",
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(400);
    expect((result.body as { error: string }).error).toBe("INVALID_BODY");
  });

  describe("AI Beta contract (mock provider)", () => {
    it("adjustWeeklyPlan returns expected shape (plan.trainingJson, plan.nutritionJson)", async () => {
      await prisma.userProfile.upsert({
        where: { userId: TEST_USER_ID },
        update: {
          daysPerWeek: 3,
          sessionMinutes: 45,
          environment: "GYM",
          mealsPerDay: 3,
          cookingTime: "MIN_20",
        },
        create: {
          userId: TEST_USER_ID,
          daysPerWeek: 3,
          sessionMinutes: 45,
          environment: "GYM",
          mealsPerDay: 3,
          cookingTime: "MIN_20",
        },
      });

      const result = await adjustWeeklyPlan({ weekStart: "2026-01-26" }, TEST_USER_ID);

      expect(result.status).toBe(200);
      const body = result.body as unknown as {
        plan: {
          trainingJson: { environment: string; daysPerWeek: number; sessions: unknown[] };
          nutritionJson: { mealsPerDay: number; days: { dayIndex: number; meals: unknown[] }[] };
        };
      };
      expect(body.plan.trainingJson).toBeDefined();
      expect(body.plan.trainingJson.environment).toBeDefined();
      expect(typeof body.plan.trainingJson.daysPerWeek).toBe("number");
      expect(body.plan.trainingJson.daysPerWeek).toBeGreaterThanOrEqual(1);
      expect(body.plan.trainingJson.daysPerWeek).toBeLessThanOrEqual(7);
      expect(Array.isArray(body.plan.trainingJson.sessions)).toBe(true);
      expect(body.plan.nutritionJson).toBeDefined();
      expect(body.plan.nutritionJson.days.length).toBe(7);
      expect(typeof body.plan.nutritionJson.mealsPerDay).toBe("number");
    });

    it("adjustWeeklyPlan never creates Exercise (no new rows)", async () => {
      await prisma.userProfile.upsert({
        where: { userId: TEST_USER_ID },
        update: {
          daysPerWeek: 3,
          sessionMinutes: 45,
          environment: "GYM",
          mealsPerDay: 3,
          cookingTime: "MIN_20",
        },
        create: {
          userId: TEST_USER_ID,
          daysPerWeek: 3,
          sessionMinutes: 45,
          environment: "GYM",
          mealsPerDay: 3,
          cookingTime: "MIN_20",
        },
      });

      await seedMain();
      const countBefore = await prisma.exercise.count();

      await adjustWeeklyPlan({ weekStart: "2026-01-26" }, TEST_USER_ID);

      const countAfter = await prisma.exercise.count();
      expect(countAfter).toBe(countBefore);
    }, 60_000);
  });
});

describe("POST /api/agent/weekly-plan authorization", () => {
  beforeEach(async () => {
    await prisma.user.upsert({
      where: { email: "test@local.test" },
      update: { id: TEST_USER_ID },
      create: { id: TEST_USER_ID, email: "test@local.test" },
    });
  });

  it("returns 401 when no session", async () => {
    vi.resetModules();
    vi.doMock("@/src/server/auth/getSession", () => ({
      getUserIdFromSession: async () => null,
    }));
    const { POST } = await import("@/src/app/api/agent/weekly-plan/route");

    const req = new Request("http://localhost/api/agent/weekly-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: "2026-01-26",
      }),
    });
    const res = await POST(req);
    const body = (await res.json()) as { error_code: string; message: string };

    expect(res.status).toBe(401);
    expect(body.error_code).toBe("UNAUTHORIZED");
  });

  it("returns 200 when session exists", async () => {
    vi.resetModules();
    vi.doMock("@/src/server/auth/getSession", () => ({
      getUserIdFromSession: async () => TEST_USER_ID,
    }));
    const { POST } = await import("@/src/app/api/agent/weekly-plan/route");

    await prisma.userProfile.upsert({
      where: { userId: TEST_USER_ID },
      update: { daysPerWeek: 3, sessionMinutes: 45, mealsPerDay: 3, cookingTime: "MIN_20" },
      create: {
        userId: TEST_USER_ID,
        daysPerWeek: 3,
        sessionMinutes: 45,
        mealsPerDay: 3,
        cookingTime: "MIN_20",
      },
    });

    const req = new Request("http://localhost/api/agent/weekly-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: "2026-01-26",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});
