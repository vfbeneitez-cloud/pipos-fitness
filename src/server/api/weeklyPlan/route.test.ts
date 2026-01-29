import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/src/server/db/prisma";
import { createWeeklyPlan, getWeeklyPlan } from "./route";
import { TrainingEnvironment } from "@prisma/client";

const TEST_USER_ID = "test-user-id";

vi.mock("@/src/server/auth/getSession", () => ({
  getUserIdFromSession: async () => TEST_USER_ID,
}));

describe("weekly plan v0", () => {
  beforeEach(async () => {
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: "test@local.test" },
    });
  });
  it("creates and fetches a weekly plan", async () => {
    await prisma.userProfile.upsert({
      where: { userId: TEST_USER_ID },
      update: { mealsPerDay: 3, cookingTime: "MIN_10", dietaryStyle: "omnivore" },
      create: {
        userId: TEST_USER_ID,
        mealsPerDay: 3,
        cookingTime: "MIN_10",
        dietaryStyle: "omnivore",
      },
    });

    const createRes = await createWeeklyPlan(
      {
        weekStart: "2026-01-26",
        environment: TrainingEnvironment.GYM,
        daysPerWeek: 3,
        sessionMinutes: 45,
      },
      TEST_USER_ID,
    );

    expect(createRes.status).toBe(200);
    const body = createRes.body as unknown as {
      id: string;
      nutritionJson: { days: { meals: unknown[] }[] };
    };
    expect(body).toHaveProperty("id");
    expect(body.nutritionJson).toBeTruthy();
    expect(body.nutritionJson.days).toBeTruthy();
    expect(body.nutritionJson.days.length).toBe(7);
    expect(body.nutritionJson.days[0].meals.length).toBe(3);

    const getRes = await getWeeklyPlan(
      `http://localhost/api/weekly-plan?weekStart=2026-01-26`,
      TEST_USER_ID,
    );

    expect(getRes.status).toBe(200);
    expect(getRes.body).not.toBeNull();
    expect((getRes.body as { trainingJson: unknown }).trainingJson).toBeTruthy();
  });

  it("returns null for non-existent plan", async () => {
    // Use a different weekStart to ensure no plan exists
    const getRes = await getWeeklyPlan(
      `http://localhost/api/weekly-plan?weekStart=2026-02-02`,
      TEST_USER_ID,
    );

    expect(getRes.status).toBe(200);
    expect(getRes.body).toBeNull();
  });

  it("returns 400 for invalid query", async () => {
    const getRes = await getWeeklyPlan(
      "http://localhost/api/weekly-plan?weekStart=invalid",
      TEST_USER_ID,
    );

    expect(getRes.status).toBe(400);
    expect((getRes.body as { error: string }).error).toBe("INVALID_QUERY");
  });

  it("returns 400 for invalid body in POST", async () => {
    const result = await createWeeklyPlan(
      {
        weekStart: "invalid",
        environment: "INVALID" as unknown as TrainingEnvironment,
        daysPerWeek: 10,
        sessionMinutes: 5,
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(400);
    expect((result.body as { error: string }).error).toBe("INVALID_BODY");
  });
});

describe("weekly plan authorization", () => {
  beforeEach(async () => {
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: "test@local.test" },
    });
  });

  describe("GET /api/weekly-plan", () => {
    it("returns 401 when no session", async () => {
      vi.resetModules();
      vi.doMock("@/src/server/auth/getSession", () => ({
        getUserIdFromSession: async () => null,
      }));
      const { GET } = await import("@/src/app/api/weekly-plan/route");

      const req = new Request("http://localhost/api/weekly-plan?weekStart=2026-01-26");
      const res = await GET(req);
      const body = (await res.json()) as { error: string };

      expect(res.status).toBe(401);
      expect(body.error).toBe("UNAUTHORIZED");
    });

    it("returns 200 when session exists", async () => {
      vi.resetModules();
      vi.doMock("@/src/server/auth/getSession", () => ({
        getUserIdFromSession: async () => TEST_USER_ID,
      }));
      const { GET } = await import("@/src/app/api/weekly-plan/route");

      const req = new Request("http://localhost/api/weekly-plan?weekStart=2026-01-26");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/weekly-plan", () => {
    it("returns 401 when no session", async () => {
      vi.resetModules();
      vi.doMock("@/src/server/auth/getSession", () => ({
        getUserIdFromSession: async () => null,
      }));
      const { POST } = await import("@/src/app/api/weekly-plan/route");

      const req = new Request("http://localhost/api/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: "2026-01-26",
          environment: TrainingEnvironment.GYM,
          daysPerWeek: 3,
          sessionMinutes: 45,
        }),
      });
      const res = await POST(req);
      const body = (await res.json()) as { error: string };

      expect(res.status).toBe(401);
      expect(body.error).toBe("UNAUTHORIZED");
    });

    it("returns 200 when session exists", async () => {
      vi.resetModules();
      vi.doMock("@/src/server/auth/getSession", () => ({
        getUserIdFromSession: async () => TEST_USER_ID,
      }));
      const { POST } = await import("@/src/app/api/weekly-plan/route");

      await prisma.userProfile.upsert({
        where: { userId: TEST_USER_ID },
        update: { mealsPerDay: 3, cookingTime: "MIN_10" },
        create: { userId: TEST_USER_ID, mealsPerDay: 3, cookingTime: "MIN_10" },
      });

      const req = new Request("http://localhost/api/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: "2026-01-26",
          environment: TrainingEnvironment.GYM,
          daysPerWeek: 3,
          sessionMinutes: 45,
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });
});
