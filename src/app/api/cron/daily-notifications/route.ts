import { NextResponse } from "next/server";
import { trackEvent } from "@/src/server/lib/events";
import { unauthorized } from "@/src/server/api/errorResponse";
import { generateDailyNotificationsForAllUsers } from "@/src/server/api/notifications/generateDaily";
import { deliverPendingEmailsForDate } from "@/src/server/api/notifications/deliverEmail";
import { deliverPendingPushForDate } from "@/src/server/api/notifications/deliverPush";

export async function POST(req: Request) {
  if (process.env.CRON_DAILY_NOTIFICATIONS_ENABLED !== "true") {
    return NextResponse.json(null, { status: 404 });
  }

  const expected = process.env.CRON_SECRET ?? "";
  if (!expected) {
    return unauthorized();
  }
  const xSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");
  const authSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : (authHeader ?? "");
  const secret = xSecret ?? authSecret;
  if (secret !== expected) {
    return unauthorized();
  }

  const nowUtc = new Date();

  try {
    const generateResult = await generateDailyNotificationsForAllUsers(nowUtc);
    const emailResult = await deliverPendingEmailsForDate(nowUtc);
    const pushResult = await deliverPendingPushForDate(nowUtc);

    trackEvent("notifications_cron_daily", {
      scanned: generateResult.scanned,
      created: generateResult.created,
      emailScanned: emailResult.scanned,
      emailSent: emailResult.sent,
      emailFailed: emailResult.failed,
      pushScanned: pushResult.scanned,
      pushSent: pushResult.sent,
      pushFailed: pushResult.failed,
    });

    return NextResponse.json({
      ok: true,
      generate: { scanned: generateResult.scanned, created: generateResult.created },
      email: { scanned: emailResult.scanned, sent: emailResult.sent, failed: emailResult.failed },
      push: { scanned: pushResult.scanned, sent: pushResult.sent, failed: pushResult.failed },
    });
  } catch (err) {
    trackEvent(
      "notifications_cron_daily",
      {
        scanned: 0,
        created: 0,
        outcome: "error",
      },
      { sentry: true },
    );
    throw err;
  }
}
