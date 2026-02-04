import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/src/server/db/prisma";
import { recomputeWeeklySnapshot } from "./snapshotRecompute";

const TEST_USER_ID = "test-user-snapshot";
const WEEK_START = "2026-02-03";

describe("recomputeWeeklySnapshot", () => {
  beforeEach(async () => {
    await prisma.weeklyAdherenceSnapshot.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.trainingLog.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.nutritionLog.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.weeklyPlan.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.userProfile.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: "snapshot@test.test" },
    });
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
  });

  it("returns 404 PLAN_NOT_FOUND when no plan", async () => {
    const result = await recomputeWeeklySnapshot(TEST_USER_ID, WEEK_START);
    expect(result.status).toBe(404);
    expect((result.body as { error_code: string }).error_code).toBe("PLAN_NOT_FOUND");
  });

  it("creates snapshot with expected % when plan and logs exist", async () => {
    const weekStartDate = new Date(`${WEEK_START}T00:00:00.000Z`);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);

    await prisma.weeklyPlan.create({
      data: {
        userId: TEST_USER_ID,
        weekStart: weekStartDate,
        status: "DRAFT",
        trainingJson: {
          sessions: [
            {
              dayIndex: 0,
              name: "Día 1",
              exercises: [{ slug: "squat", name: "Squat", sets: 3, reps: "10", restSec: 60 }],
            },
          ],
        },
        nutritionJson: {
          days: [
            {
              dayIndex: 0,
              meals: [
                {
                  slot: "breakfast",
                  title: "Desayuno",
                  minutes: 15,
                  tags: [],
                  ingredients: [],
                  instructions: "",
                  substitutions: [],
                },
              ],
            },
          ],
          mealsPerDay: 3,
        },
      },
    });

    await prisma.trainingLog.create({
      data: {
        userId: TEST_USER_ID,
        occurredAt: weekStartDate,
        completed: true,
      },
    });

    const result = await recomputeWeeklySnapshot(TEST_USER_ID, WEEK_START);
    expect(result.status).toBe(200);
    const body = result.body as {
      weekStart: string;
      totalPercent: number;
      breakdown: {
        training: { planned: number; completed: number; percent: number };
        nutrition: { planned: number; completed: number; percent: number };
        schemaVersion?: number;
        method?: string;
        computedFrom?: string;
      };
    };
    expect(body.weekStart).toBe(WEEK_START);
    expect(body.breakdown.training.planned).toBe(1);
    expect(body.breakdown.training.completed).toBe(1);
    expect(body.breakdown.training.percent).toBe(100);
    expect(body.breakdown.nutrition.planned).toBe(1);
    expect(body.breakdown.nutrition.completed).toBe(0);
    expect(body.breakdown.nutrition.percent).toBe(0);
    expect(body.breakdown.schemaVersion).toBe(1);
    expect(body.breakdown.computedFrom).toBe("snapshot_recompute");
  });

  it("caps nutrition per day to mealsPerDay (same as on-the-fly)", async () => {
    const weekStartDate = new Date(`${WEEK_START}T00:00:00.000Z`);

    await prisma.weeklyPlan.create({
      data: {
        userId: TEST_USER_ID,
        weekStart: weekStartDate,
        status: "DRAFT",
        trainingJson: { sessions: [] },
        nutritionJson: {
          days: [{ dayIndex: 0, meals: [{ slot: "b", title: "B" }] }],
          mealsPerDay: 3,
        },
      },
    });

    for (let i = 0; i < 5; i++) {
      await prisma.nutritionLog.create({
        data: {
          userId: TEST_USER_ID,
          occurredAt: weekStartDate,
          followedPlan: true,
        },
      });
    }

    const result = await recomputeWeeklySnapshot(TEST_USER_ID, WEEK_START);
    expect(result.status).toBe(200);
    const body = result.body as { breakdown: { nutrition: { planned: number; completed: number } } };
    expect(body.breakdown.nutrition.planned).toBe(1);
    expect(body.breakdown.nutrition.completed).toBe(3);
  });
});
