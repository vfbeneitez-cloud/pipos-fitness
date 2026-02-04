/**
 * Deliver pending notification emails for users eligible at given hour.
 * Idempotent: never re-send if emailStatus === "SENT".
 */

import { prisma } from "@/src/server/db/prisma";
import { trackEvent } from "@/src/server/lib/events";
import { buildEmailSubject, buildEmailBodyText } from "@/src/core/notifications/emailPolicy";
import { getEmailSender } from "@/src/server/notifications/emailSender";

const MAX_EMAIL_ATTEMPTS = 3;
const TRUNCATE_ERROR_LEN = 200;

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + "...";
}

export async function deliverPendingEmailsForDate(
  nowUtc: Date,
): Promise<{ scanned: number; sent: number; failed: number }> {
  if (process.env.NOTIFICATIONS_EMAIL_ENABLED !== "true") {
    return { scanned: 0, sent: 0, failed: 0 };
  }

  const hour = nowUtc.getUTCHours();
  const since = new Date(nowUtc);
  since.setUTCHours(since.getUTCHours() - 24);

  const profiles = await prisma.userProfile.findMany({
    where: {
      emailNotificationsEnabled: true,
      emailNotificationHourUtc: hour,
    },
    select: { userId: true },
  });

  const userIds = profiles.map((p) => p.userId);
  if (userIds.length === 0) {
    trackEvent("notifications_email_delivery", {
      scanned: 0,
      sent: 0,
      failed: 0,
      senderId: getEmailSender().id,
    });
    return { scanned: 0, sent: 0, failed: 0 };
  }

  const notifications = await prisma.notification.findMany({
    where: {
      userId: { in: userIds },
      createdAt: { gte: since },
      OR: [{ emailStatus: null }, { emailStatus: { not: "SENT" } }],
      emailAttemptCount: { lt: MAX_EMAIL_ATTEMPTS },
    },
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      emailAttemptCount: true,
      user: { select: { email: true } },
    },
  });

  const sender = getEmailSender();
  let sent = 0;
  let failed = 0;

  for (const n of notifications) {
    const to = n.user.email;
    const currentAttempt = n.emailAttemptCount;
    const claimWhere = {
      id: n.id,
      emailAttemptCount: currentAttempt,
      OR: [{ emailStatus: null }, { emailStatus: { not: "SENT" } }] as const,
    };

    if (!to) {
      const updated = await prisma.notification.updateMany({
        where: claimWhere,
        data: {
          emailStatus: "FAILED",
          emailError: truncate("User has no email", TRUNCATE_ERROR_LEN),
          emailAttemptCount: { increment: 1 },
        },
      });
      if (updated.count > 0) failed++;
      continue;
    }

    const claimed = await prisma.notification.updateMany({
      where: claimWhere,
      data: { emailAttemptCount: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    const subject = buildEmailSubject({ type: n.type, title: n.title, message: n.message });
    const text = buildEmailBodyText({ type: n.type, title: n.title, message: n.message });
    const result = await sender.send({ to, subject, text });

    if (result.ok) {
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          emailStatus: "SENT",
          emailSentAt: nowUtc,
          emailError: null,
        },
      });
      sent++;
    } else {
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          emailStatus: "FAILED",
          emailError: truncate(result.error, TRUNCATE_ERROR_LEN),
        },
      });
      failed++;
    }
  }

  const scanned = notifications.length;
  trackEvent("notifications_email_delivery", {
    scanned,
    sent,
    failed,
    senderId: sender.id,
  });

  return { scanned, sent, failed };
}
