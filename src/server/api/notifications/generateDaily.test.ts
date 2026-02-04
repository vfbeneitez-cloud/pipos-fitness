import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/src/server/db/prisma";
import { formatUtcDayKey, getWeekStart } from "@/src/app/lib/week";
import {
  generateDailyNotificationsForAllUsers,
  generateDailyNotificationsForUser,
} from "./generateDaily";

function dayIndexFromDate(d: Date): number {
  const day = d.getUTCDay();
  return day === 0 ? 6 : day - 1;
}

const TEST_USER_ID = "test-user-daily-notif";
const RUN_DATE_UTC = new Date("2026-02-04T12:00:00.000Z"); // Wednesday → dayIndex 2

describe("generateDailyNotificationsForUser", () => {
  beforeEach(async () => {
    await prisma.notification.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.trainingLog.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.weeklyAdherenceSnapshot.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.weeklyPlan.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.userProfile.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: "daily-notif@test.test" },
    });
    await prisma.userProfile.upsert({
      where: { userId: TEST_USER_ID },
      update: { adherenceGoalPercent: 70 },
      create: { userId: TEST_USER_ID, adherenceGoalPercent: 70 },
    });
  });

  it("creates TODAY_TRAINING_REMINDER when session planned today and no completed log", async () => {
    const weekStart = getWeekStart(RUN_DATE_UTC);
    const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
    const todayDayIndex = dayIndexFromDate(RUN_DATE_UTC);

    await prisma.weeklyAdherenceSnapshot.create({
      data: {
        userId: TEST_USER_ID,
        weekStart: weekStartDate,
        trainingPercent: 80,
        nutritionPercent: 80,
        totalPercent: 80,
        breakdownJson: {
          training: { planned: 1, completed: 1, percent: 80 },
          nutrition: { planned: 7, completed: 6, percent: 86 },
          totalPercent: 80,
        },
      },
    });

    await prisma.weeklyPlan.create({
      data: {
        userId: TEST_USER_ID,
        weekStart: weekStartDate,
        status: "DRAFT",
        trainingJson: {
          sessions: [
            {
              dayIndex: todayDayIndex,
              name: "Día 1",
              exercises: [{ slug: "squat", name: "Squat", sets: 3, reps: "10", restSec: 60 }],
            },
          ],
        },
        nutritionJson: { days: [], mealsPerDay: 3 },
      },
    });

    const { created } = await generateDailyNotificationsForUser(TEST_USER_ID, RUN_DATE_UTC);

    expect(created).toBe(1);
    const notif = await prisma.notification.findFirst({
      where: { userId: TEST_USER_ID, type: "TODAY_TRAINING_REMINDER" },
    });
    expect(notif).toBeDefined();
    expect(notif?.scopeKey).toBe(`day:${formatUtcDayKey(RUN_DATE_UTC)}`);
  });

  it("idempotent: second run does not duplicate", async () => {
    const weekStart = getWeekStart(RUN_DATE_UTC);
    const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
    const todayDayIndex = dayIndexFromDate(RUN_DATE_UTC);

    await prisma.weeklyAdherenceSnapshot.create({
      data: {
        userId: TEST_USER_ID,
        weekStart: weekStartDate,
        trainingPercent: 80,
        nutritionPercent: 80,
        totalPercent: 80,
        breakdownJson: {
          training: { planned: 1, completed: 1, percent: 80 },
          nutrition: { planned: 7, completed: 6, percent: 86 },
          totalPercent: 80,
        },
      },
    });

    await prisma.weeklyPlan.create({
      data: {
        userId: TEST_USER_ID,
        weekStart: weekStartDate,
        status: "DRAFT",
        trainingJson: {
          sessions: [
            {
              dayIndex: todayDayIndex,
              name: "Día 1",
              exercises: [{ slug: "squat", name: "Squat", sets: 3, reps: "10", restSec: 60 }],
            },
          ],
        },
        nutritionJson: { days: [], mealsPerDay: 3 },
      },
    });

    const first = await generateDailyNotificationsForUser(TEST_USER_ID, RUN_DATE_UTC);
    const second = await generateDailyNotificationsForUser(TEST_USER_ID, RUN_DATE_UTC);

    expect(first.created).toBe(1);
    expect(second.created).toBe(0);
    const count = await prisma.notification.count({
      where: {
        userId: TEST_USER_ID,
        type: "TODAY_TRAINING_REMINDER",
        scopeKey: `day:${formatUtcDayKey(RUN_DATE_UTC)}`,
      },
    });
    expect(count).toBe(1);
  });
});

describe.skip("generateDailyNotificationsForAllUsers (perf test/manual)", () => {
  it("runs without error and returns scanned/created (slow: all users)", async () => {
    const { created, scanned } = await generateDailyNotificationsForAllUsers(new Date());
    expect(typeof scanned).toBe("number");
    expect(scanned).toBeGreaterThanOrEqual(0);
    expect(typeof created).toBe("number");
    expect(created).toBeGreaterThanOrEqual(0);
  });
});
