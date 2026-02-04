import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/src/server/db/prisma";
import { swapMeal } from "./swap";

const TEST_USER_ID = "test-user-id";

vi.mock("@/src/server/auth/getSession", () => ({
  getUserIdFromSession: async () => TEST_USER_ID,
}));

describe("POST /api/nutrition/swap", () => {
  beforeEach(async () => {
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: "test@local.test" },
    });
  });
  it("swaps a meal successfully", async () => {
    const weekStart = "2026-01-19";
    await prisma.userProfile.upsert({
      where: { userId: TEST_USER_ID },
      update: { mealsPerDay: 3, cookingTime: "MIN_20", dietaryStyle: "omnivore" },
      create: {
        userId: TEST_USER_ID,
        mealsPerDay: 3,
        cookingTime: "MIN_20",
        dietaryStyle: "omnivore",
      },
    });

    const threeMealsPlanJson = {
      days: [
        {
          dayIndex: 0,
          meals: [
            {
              slot: "breakfast",
              title: "Test breakfast",
              minutes: 10,
              tags: [],
              ingredients: [],
              instructions: "",
              substitutions: [],
            },
            {
              slot: "lunch",
              title: "Test lunch",
              minutes: 20,
              tags: [],
              ingredients: [],
              instructions: "",
              substitutions: [],
            },
            {
              slot: "dinner",
              title: "Test dinner",
              minutes: 30,
              tags: [],
              ingredients: [],
              instructions: "",
              substitutions: [],
            },
          ],
        },
      ],
    };
    await prisma.weeklyPlan.upsert({
      where: {
        userId_weekStart: {
          userId: TEST_USER_ID,
          weekStart: new Date(`${weekStart}T00:00:00.000Z`),
        },
      },
      update: { nutritionJson: threeMealsPlanJson },
      create: {
        userId: TEST_USER_ID,
        weekStart: new Date(`${weekStart}T00:00:00.000Z`),
        status: "DRAFT",
        trainingJson: { sessions: [] },
        nutritionJson: threeMealsPlanJson,
      },
    });

    const result = await swapMeal(
      {
        weekStart,
        dayIndex: 0,
        mealIndex: 1,
        reason: "dislike",
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(200);
    const body = result.body as { meal: { slot: string; title: string } };
    expect(body.meal).toBeDefined();
    expect(body.meal.slot).toBe("lunch");
  });

  it("returns 400 for invalid body", async () => {
    const result = await swapMeal(
      {
        weekStart: "invalid",
        dayIndex: 10,
        mealSlot: "invalid",
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(400);
    expect((result.body as { error: string }).error).toBe("INVALID_BODY");
  });

  it("returns 404 for non-existent plan", async () => {
    // Use a week no other test creates to avoid pollution
    const result = await swapMeal(
      {
        weekStart: "2030-01-06",
        dayIndex: 0,
        mealSlot: "lunch",
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(404);
    expect((result.body as { error: string }).error).toBe("PLAN_NOT_FOUND");
  });

  it("swaps snack (mealIndex 3) when mealsPerDay=4 with 1 snack", async () => {
    await prisma.userProfile.upsert({
      where: { userId: TEST_USER_ID },
      update: { mealsPerDay: 4, cookingTime: "MIN_20", dietaryStyle: "omnivore" },
      create: {
        userId: TEST_USER_ID,
        mealsPerDay: 4,
        cookingTime: "MIN_20",
        dietaryStyle: "omnivore",
      },
    });

    const fourMealsJson = {
      days: [
        {
          dayIndex: 0,
          meals: [
            {
              slot: "breakfast",
              title: "B1",
              minutes: 10,
              tags: [],
              ingredients: [],
              instructions: "",
              substitutions: [],
            },
            {
              slot: "lunch",
              title: "L1",
              minutes: 20,
              tags: [],
              ingredients: [],
              instructions: "",
              substitutions: [],
            },
            {
              slot: "dinner",
              title: "D1",
              minutes: 30,
              tags: [],
              ingredients: [],
              instructions: "",
              substitutions: [],
            },
            {
              slot: "snack",
              title: "S1",
              minutes: 5,
              tags: [],
              ingredients: [],
              instructions: "",
              substitutions: [],
            },
          ],
        },
      ],
    };
    await prisma.weeklyPlan.upsert({
      where: {
        userId_weekStart: {
          userId: TEST_USER_ID,
          weekStart: new Date("2026-01-26T00:00:00.000Z"),
        },
      },
      update: { nutritionJson: fourMealsJson },
      create: {
        userId: TEST_USER_ID,
        weekStart: new Date("2026-01-26T00:00:00.000Z"),
        status: "DRAFT",
        trainingJson: { sessions: [] },
        nutritionJson: fourMealsJson,
      },
    });

    const result = await swapMeal(
      { weekStart: "2026-01-26", dayIndex: 0, mealIndex: 3 },
      TEST_USER_ID,
    );

    expect(result.status).toBe(200);
    const body = result.body as { meal: { slot: string; title: string } };
    expect(body.meal).toBeDefined();
    expect(body.meal.slot).toBe("snack");
  });

  it("swaps via legacy mealSlot when slot is unique", async () => {
    await prisma.userProfile.upsert({
      where: { userId: TEST_USER_ID },
      update: { mealsPerDay: 3, cookingTime: "MIN_20" },
      create: { userId: TEST_USER_ID, mealsPerDay: 3, cookingTime: "MIN_20" },
    });
    const threeMealsJson = {
      days: [
        {
          dayIndex: 0,
          meals: [
            {
              slot: "breakfast",
              title: "B",
              minutes: 10,
              tags: [],
              ingredients: [],
              instructions: "",
              substitutions: [],
            },
            {
              slot: "lunch",
              title: "L",
              minutes: 20,
              tags: [],
              ingredients: [],
              instructions: "",
              substitutions: [],
            },
            {
              slot: "dinner",
              title: "D",
              minutes: 30,
              tags: [],
              ingredients: [],
              instructions: "",
              substitutions: [],
            },
          ],
        },
      ],
    };
    await prisma.weeklyPlan.upsert({
      where: {
        userId_weekStart: { userId: TEST_USER_ID, weekStart: new Date("2026-01-26T00:00:00.000Z") },
      },
      update: { nutritionJson: threeMealsJson },
      create: {
        userId: TEST_USER_ID,
        weekStart: new Date("2026-01-26T00:00:00.000Z"),
        status: "DRAFT",
        trainingJson: {},
        nutritionJson: threeMealsJson,
      },
    });

    const result = await swapMeal(
      { weekStart: "2026-01-26", dayIndex: 0, mealSlot: "lunch" },
      TEST_USER_ID,
    );

    expect(result.status).toBe(200);
    const body = result.body as { meal: { slot: string } };
    expect(body.meal.slot).toBe("lunch");
  });
});

describe("POST /api/nutrition/swap authorization", () => {
  beforeEach(async () => {
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: "test@local.test" },
    });
  });

  it("returns 401 when no session", async () => {
    vi.resetModules();
    vi.doMock("@/src/server/auth/getSession", () => ({
      getUserIdFromSession: async () => null,
    }));
    const { POST } = await import("@/src/app/api/nutrition/swap/route");

    const req = new Request("http://localhost/api/nutrition/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: "2026-01-26",
        dayIndex: 0,
        mealSlot: "lunch",
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
    const { POST } = await import("@/src/app/api/nutrition/swap/route");

    await prisma.userProfile.upsert({
      where: { userId: TEST_USER_ID },
      update: { mealsPerDay: 3, cookingTime: "MIN_20" },
      create: { userId: TEST_USER_ID, mealsPerDay: 3, cookingTime: "MIN_20" },
    });

    await prisma.weeklyPlan.upsert({
      where: {
        userId_weekStart: {
          userId: TEST_USER_ID,
          weekStart: new Date("2026-01-26T00:00:00.000Z"),
        },
      },
      update: {},
      create: {
        userId: TEST_USER_ID,
        weekStart: new Date("2026-01-26T00:00:00.000Z"),
        status: "DRAFT",
        trainingJson: {},
        nutritionJson: { days: [{ dayIndex: 0, meals: [] }] },
      },
    });

    const req = new Request("http://localhost/api/nutrition/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: "2026-01-26",
        dayIndex: 0,
        mealSlot: "lunch",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});
