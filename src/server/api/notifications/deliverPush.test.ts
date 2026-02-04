import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/src/server/db/prisma";
import { deliverPendingPushForDate } from "./deliverPush";

const TEST_USER_ID = "test-user-deliver-push";
const TEST_ENDPOINT = "https://fcm.googleapis.com/fcm/send/test-sub-id";

describe("deliverPendingPushForDate", () => {
  beforeEach(async () => {
    await prisma.notification.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.pushSubscription.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.userProfile.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: "deliver-push@test.test" },
    });
  });

  it("returns zeros when NOTIFICATIONS_PUSH_ENABLED is not true", async () => {
    const orig = process.env.NOTIFICATIONS_PUSH_ENABLED;
    process.env.NOTIFICATIONS_PUSH_ENABLED = "false";
    try {
      const result = await deliverPendingPushForDate(new Date());
      expect(result).toEqual({ scanned: 0, sent: 0, failed: 0 });
    } finally {
      process.env.NOTIFICATIONS_PUSH_ENABLED = orig;
    }
  });

  it("sends push and marks SENT; second run is idempotent (sent=0)", async () => {
    const orig = process.env.NOTIFICATIONS_PUSH_ENABLED;
    process.env.NOTIFICATIONS_PUSH_ENABLED = "true";
    try {
      const now = new Date("2026-02-08T10:30:00.000Z");
      await prisma.userProfile.upsert({
        where: { userId: TEST_USER_ID },
        update: {
          pushNotificationsEnabled: true,
          pushQuietHoursStartUtc: 22,
          pushQuietHoursEndUtc: 7,
        },
        create: {
          userId: TEST_USER_ID,
          pushNotificationsEnabled: true,
          pushQuietHoursStartUtc: 22,
          pushQuietHoursEndUtc: 7,
        },
      });
      await prisma.pushSubscription.create({
        data: {
          userId: TEST_USER_ID,
          endpoint: TEST_ENDPOINT,
          p256dh: "dGVzdA==",
          auth: "dGVzdA==",
        },
      });
      await prisma.notification.create({
        data: {
          userId: TEST_USER_ID,
          type: "TODAY_TRAINING_REMINDER",
          scopeKey: `day:${now.toISOString().slice(0, 10)}`,
          title: "Test",
          message: "Test",
        },
      });

      const first = await deliverPendingPushForDate(now);
      expect(first.sent).toBe(1);
      expect(first.failed).toBe(0);

      const notif = await prisma.notification.findFirst({
        where: { userId: TEST_USER_ID },
      });
      expect(notif?.pushStatus).toBe("SENT");

      const second = await deliverPendingPushForDate(now);
      expect(second.sent).toBe(0);
      expect(second.scanned).toBe(0);
    } finally {
      process.env.NOTIFICATIONS_PUSH_ENABLED = orig;
    }
  });

  it("pushAttemptCount 3 → no retry (scanned=0)", async () => {
    const orig = process.env.NOTIFICATIONS_PUSH_ENABLED;
    process.env.NOTIFICATIONS_PUSH_ENABLED = "true";
    try {
      const now = new Date();
      await prisma.userProfile.upsert({
        where: { userId: TEST_USER_ID },
        update: {
          pushNotificationsEnabled: true,
          pushQuietHoursStartUtc: 23,
          pushQuietHoursEndUtc: 6,
        },
        create: {
          userId: TEST_USER_ID,
          pushNotificationsEnabled: true,
          pushQuietHoursStartUtc: 23,
          pushQuietHoursEndUtc: 6,
        },
      });
      await prisma.notification.create({
        data: {
          userId: TEST_USER_ID,
          type: "X",
          scopeKey: `day:${now.toISOString().slice(0, 10)}`,
          title: "T",
          message: "M",
          pushStatus: "FAILED",
          pushAttemptCount: 3,
        },
      });

      const result = await deliverPendingPushForDate(now);
      expect(result.scanned).toBe(0);
    } finally {
      process.env.NOTIFICATIONS_PUSH_ENABLED = orig;
    }
  });
});
