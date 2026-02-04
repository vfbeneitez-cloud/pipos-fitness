import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/src/server/db/prisma";
import { deliverPendingEmailsForDate } from "./deliverEmail";

const TEST_USER_ID = "test-user-deliver-email";
const TEST_EMAIL = "deliver-email@test.test";

describe("deliverPendingEmailsForDate", () => {
  beforeEach(async () => {
    await prisma.notification.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.userProfile.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: { email: TEST_EMAIL },
      create: { id: TEST_USER_ID, email: TEST_EMAIL },
    });
  });

  it("returns zeros when NOTIFICATIONS_EMAIL_ENABLED is not true", async () => {
    const orig = process.env.NOTIFICATIONS_EMAIL_ENABLED;
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "false";
    try {
      const result = await deliverPendingEmailsForDate(new Date());
      expect(result).toEqual({ scanned: 0, sent: 0, failed: 0 });
    } finally {
      process.env.NOTIFICATIONS_EMAIL_ENABLED = orig;
    }
  });

  it("sends email and marks SENT; second run is idempotent (sent=0)", async () => {
    const orig = process.env.NOTIFICATIONS_EMAIL_ENABLED;
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    try {
      const now = new Date();
      const hour = now.getUTCHours();
      await prisma.userProfile.upsert({
        where: { userId: TEST_USER_ID },
        update: {
          emailNotificationsEnabled: true,
          emailNotificationHourUtc: hour,
        },
        create: {
          userId: TEST_USER_ID,
          emailNotificationsEnabled: true,
          emailNotificationHourUtc: hour,
        },
      });

      await prisma.notification.create({
        data: {
          userId: TEST_USER_ID,
          type: "TODAY_TRAINING_REMINDER",
          scopeKey: `day:${now.toISOString().slice(0, 10)}`,
          title: "Sesión pendiente",
          message: "Hay una sesión planificada para hoy.",
        },
      });

      const first = await deliverPendingEmailsForDate(now);
      expect(first.sent).toBe(1);
      expect(first.failed).toBe(0);

      const notif = await prisma.notification.findFirst({
        where: { userId: TEST_USER_ID, type: "TODAY_TRAINING_REMINDER" },
      });
      expect(notif?.emailStatus).toBe("SENT");
      expect(notif?.emailSentAt).toBeDefined();

      const second = await deliverPendingEmailsForDate(now);
      expect(second.sent).toBe(0);
      expect(second.scanned).toBe(0);
    } finally {
      process.env.NOTIFICATIONS_EMAIL_ENABLED = orig;
    }
  });

  it("misconfig (missing creds) marks FAILED, not SENT", async () => {
    const origEnabled = process.env.NOTIFICATIONS_EMAIL_ENABLED;
    const origDryRun = process.env.NOTIFICATIONS_EMAIL_DRY_RUN;
    const origKey = process.env.SENDGRID_API_KEY;
    const origFrom = process.env.SENDGRID_FROM_EMAIL;
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    process.env.NOTIFICATIONS_EMAIL_DRY_RUN = "false";
    process.env.SENDGRID_API_KEY = "";
    process.env.SENDGRID_FROM_EMAIL = "";
    try {
      const now = new Date();
      const hour = now.getUTCHours();
      await prisma.userProfile.upsert({
        where: { userId: TEST_USER_ID },
        update: {
          emailNotificationsEnabled: true,
          emailNotificationHourUtc: hour,
        },
        create: {
          userId: TEST_USER_ID,
          emailNotificationsEnabled: true,
          emailNotificationHourUtc: hour,
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

      const result = await deliverPendingEmailsForDate(now);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);

      const notif = await prisma.notification.findFirst({
        where: { userId: TEST_USER_ID },
      });
      expect(notif?.emailStatus).toBe("FAILED");
      expect(notif?.emailError).toContain("misconfigured");
    } finally {
      process.env.NOTIFICATIONS_EMAIL_ENABLED = origEnabled;
      process.env.NOTIFICATIONS_EMAIL_DRY_RUN = origDryRun;
      process.env.SENDGRID_API_KEY = origKey;
      process.env.SENDGRID_FROM_EMAIL = origFrom;
    }
  });

  it("FAILED 3 times → no retry (scanned=0)", async () => {
    const orig = process.env.NOTIFICATIONS_EMAIL_ENABLED;
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    try {
      const now = new Date();
      const hour = now.getUTCHours();
      await prisma.userProfile.upsert({
        where: { userId: TEST_USER_ID },
        update: {
          emailNotificationsEnabled: true,
          emailNotificationHourUtc: hour,
        },
        create: {
          userId: TEST_USER_ID,
          emailNotificationsEnabled: true,
          emailNotificationHourUtc: hour,
        },
      });

      await prisma.notification.create({
        data: {
          userId: TEST_USER_ID,
          type: "TODAY_TRAINING_REMINDER",
          scopeKey: `day:${now.toISOString().slice(0, 10)}`,
          title: "Test",
          message: "Test",
          emailStatus: "FAILED",
          emailAttemptCount: 3,
        },
      });

      const result = await deliverPendingEmailsForDate(now);
      expect(result.scanned).toBe(0);
      expect(result.sent).toBe(0);
    } finally {
      process.env.NOTIFICATIONS_EMAIL_ENABLED = orig;
    }
  });
});
