import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { prisma } from "@/src/server/db/prisma";
import { adjustWeeklyPlan } from "@/src/server/ai/agentWeeklyPlan";
import { getWeekStart } from "@/src/app/lib/week";

const LOCK_STALE_MS = 15 * 60 * 1000;

function weekStartToDate(weekStart: string): Date {
  return new Date(`${weekStart}T00:00:00.000Z`);
}

export async function POST(req: Request) {
  if (process.env.CRON_WEEKLY_REGEN_ENABLED !== "true") {
    return NextResponse.json(null, { status: 404 });
  }

  const expected = process.env.CRON_SECRET ?? "";
  if (!expected) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const xSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");
  const authSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : (authHeader ?? "");
  const secret = xSecret ?? authSecret;
  if (secret !== expected) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return withSensitiveRoute(req, async () => {
    const profiles = await prisma.userProfile.findMany({
      select: { userId: true },
    });
    const userIds = profiles.map((p) => p.userId);
    const weekStart = getWeekStart(new Date());
    const weekStartDate = weekStartToDate(weekStart);
    const lockStaleBefore = new Date(Date.now() - LOCK_STALE_MS);

    let succeeded = 0;
    let failed = 0;
    let skippedLocked = 0;

    for (const userId of userIds) {
      const lockId = randomUUID();
      const now = new Date();
      const acquired = await prisma.weeklyPlan.updateMany({
        where: {
          userId,
          weekStart: weekStartDate,
          OR: [{ regenLockedAt: null }, { regenLockedAt: { lt: lockStaleBefore } }],
        },
        data: { regenLockId: lockId, regenLockedAt: now },
      });

      if (acquired.count === 0) {
        skippedLocked += 1;
        continue;
      }

      try {
        const result = await adjustWeeklyPlan({ weekStart }, userId);
        if (result.status === 200) {
          succeeded += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      } finally {
        await prisma.weeklyPlan.updateMany({
          where: { userId, weekStart: weekStartDate, regenLockId: lockId },
          data: { regenLockId: null, regenLockedAt: null },
        });
      }
    }

    const summary = { processed: userIds.length, succeeded, failed, skippedLocked };
    if (failed > 0) {
      Sentry.captureMessage("cron.weekly-regenerate partial failure", {
        level: failed === summary.processed && summary.processed > 0 ? "error" : "warning",
        extra: summary,
      });
    }

    return NextResponse.json({
      ok: true,
      processed: summary.processed,
      succeeded: summary.succeeded,
      failed: summary.failed,
      skippedLocked: summary.skippedLocked,
    });
  });
}
