/**
 * Deliver pending push notifications for users eligible (not in quiet hours).
 * Idempotent: never re-send if pushStatus === "SENT".
 */

import { prisma } from "@/src/server/db/prisma";
import { trackEvent } from "@/src/server/lib/events";
import { buildPushPayload } from "@/src/core/notifications/pushPolicy";
import { shouldSendPushNow } from "@/src/core/notifications/pushPolicy";
import { getPushSender } from "@/src/server/notifications/pushSender";

const MAX_PUSH_ATTEMPTS = 3;
const TRUNCATE_ERROR_LEN = 200;
const GONE_STATUS_CODES = [404, 410];

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + "...";
}

export async function deliverPendingPushForDate(
  nowUtc: Date,
): Promise<{ scanned: number; sent: number; failed: number }> {
  if (process.env.NOTIFICATIONS_PUSH_ENABLED !== "true") {
    return { scanned: 0, sent: 0, failed: 0 };
  }

  const since = new Date(nowUtc);
  since.setUTCHours(since.getUTCHours() - 24);

  const profiles = await prisma.userProfile.findMany({
    where: { pushNotificationsEnabled: true },
    select: {
      userId: true,
      pushQuietHoursStartUtc: true,
      pushQuietHoursEndUtc: true,
    },
  });

  const eligibleUserIds: string[] = [];
  for (const p of profiles) {
    if (
      shouldSendPushNow({
        nowUtc,
        enabled: true,
        startHourUtc: p.pushQuietHoursStartUtc,
        endHourUtc: p.pushQuietHoursEndUtc,
      })
    ) {
      eligibleUserIds.push(p.userId);
    }
  }

  if (eligibleUserIds.length === 0) {
    const sender = getPushSender();
    trackEvent("notifications_push_delivery", {
      scanned: 0,
      sent: 0,
      failed: 0,
      senderId: sender.id,
    });
    return { scanned: 0, sent: 0, failed: 0 };
  }

  const notifications = await prisma.notification.findMany({
    where: {
      userId: { in: eligibleUserIds },
      createdAt: { gte: since },
      OR: [{ pushStatus: null }, { pushStatus: { not: "SENT" } }],
      pushAttemptCount: { lt: MAX_PUSH_ATTEMPTS },
    },
    select: {
      id: true,
      type: true,
      scopeKey: true,
      title: true,
      message: true,
      pushAttemptCount: true,
      userId: true,
    },
  });

  const sender = getPushSender();
  let sent = 0;
  let failed = 0;

  for (const n of notifications) {
    const currentAttempt = n.pushAttemptCount;
    const claimWhere = {
      id: n.id,
      pushAttemptCount: currentAttempt,
      OR: [{ pushStatus: null }, { pushStatus: { not: "SENT" } }] as const,
    };

    const claimed = await prisma.notification.updateMany({
      where: claimWhere,
      data: { pushAttemptCount: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    const subs = await prisma.pushSubscription.findMany({
      where: { userId: n.userId },
      select: { endpoint: true, p256dh: true, auth: true },
    });

    if (subs.length === 0) {
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          pushStatus: "FAILED",
          pushError: truncate("No push subscription", TRUNCATE_ERROR_LEN),
        },
      });
      failed++;
      continue;
    }

    const payload = buildPushPayload({
      id: n.id,
      type: n.type,
      scopeKey: n.scopeKey,
      title: n.title,
      message: n.message,
    });
    const payloadJson = JSON.stringify(payload);

    let anySent = false;
    let lastError: string | null = null;

    for (const sub of subs) {
      const result = await sender.send(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payloadJson,
      );

      if (result.ok) {
        anySent = true;
      } else {
        lastError = result.error;
        if (result.statusCode && GONE_STATUS_CODES.includes(result.statusCode)) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        }
      }
    }

    if (anySent) {
      await prisma.notification.update({
        where: { id: n.id },
        data: { pushStatus: "SENT", pushSentAt: nowUtc, pushError: null },
      });
      sent++;
    } else {
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          pushStatus: "FAILED",
          pushError: truncate(lastError ?? "unknown", TRUNCATE_ERROR_LEN),
        },
      });
      failed++;
    }
  }

  const scanned = notifications.length;
  trackEvent("notifications_push_delivery", {
    scanned,
    sent,
    failed,
    senderId: sender.id,
  });

  return { scanned, sent, failed };
}
