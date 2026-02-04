import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/src/server/db/prisma";
import { getAdherenceSummary } from "./summary";

const TEST_USER_ID = "test-user-summary";
const WEEK_1 = "2026-02-03";
const WEEK_2 = "2026-02-10";

describe("getAdherenceSummary", () => {
  beforeEach(async () => {
    await prisma.weeklyAdherenceSnapshot.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.weeklyPlan.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.userProfile.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: "summary@test.test" },
    });
    await prisma.userProfile.upsert({
      where: { userId: TEST_USER_ID },
      update: { adherenceGoalPercent: 70 },
      create: { userId: TEST_USER_ID, adherenceGoalPercent: 70 },
    });
  });

  it("returns goal+streak+nudge with known snapshots", async () => {
    const week1Date = new Date(`${WEEK_1}T00:00:00.000Z`);
    const week2Date = new Date(`${WEEK_2}T00:00:00.000Z`);

    await prisma.weeklyPlan.create({
      data: {
        userId: TEST_USER_ID,
        weekStart: week1Date,
        status: "DRAFT",
        trainingJson: { sessions: [{ dayIndex: 0, name: "A", exercises: [{ slug: "x", sets: 1 }] }] },
        nutritionJson: { days: [{ dayIndex: 0, meals: [{}] }], mealsPerDay: 3 },
      },
    });

    await prisma.weeklyAdherenceSnapshot.createMany({
      data: [
        {
          userId: TEST_USER_ID,
          weekStart: week2Date,
          trainingPercent: 80,
          nutritionPercent: 75,
          totalPercent: 78,
          breakdownJson: {
            training: { planned: 1, completed: 1, percent: 80 },
            nutrition: { planned: 7, completed: 5, percent: 71 },
            totalPercent: 78,
            schemaVersion: 1,
            method: "v1",
            computedFrom: "snapshot_recompute",
          },
        },
        {
          userId: TEST_USER_ID,
          weekStart: week1Date,
          trainingPercent: 100,
          nutritionPercent: 67,
          totalPercent: 84,
          breakdownJson: {
            training: { planned: 1, completed: 1, percent: 100 },
            nutrition: { planned: 7, completed: 5, percent: 71 },
            totalPercent: 84,
            schemaVersion: 1,
            method: "v1",
            computedFrom: "snapshot_recompute",
          },
        },
      ],
    });

    const url = `http://x/api/adherence/summary?weeks=8&weekStart=${WEEK_2}`;
    const result = await getAdherenceSummary(TEST_USER_ID, url);

    expect(result.status).toBe(200);
    const body = result.body as {
      goalPercent: number;
      streak: { currentStreakWeeks: number; goalPercent: number };
      currentWeek: { weekStart: string; totalPercent: number; source: string } | null;
      nudge: { type: string; severity: string };
    };
    expect(body.goalPercent).toBe(70);
    expect(body.streak.currentStreakWeeks).toBeGreaterThanOrEqual(1);
    expect(body.currentWeek).not.toBeNull();
    expect(body.currentWeek!.weekStart).toBe(WEEK_2);
    expect(body.currentWeek!.source).toBe("snapshot");
    expect(body.nudge.type).toBe("ON_TRACK");
  });
});
