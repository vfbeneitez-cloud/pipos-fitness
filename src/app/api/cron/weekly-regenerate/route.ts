import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { prisma } from "@/src/server/db/prisma";
import { adjustWeeklyPlan } from "@/src/server/ai/agentWeeklyPlan";
import { getWeekStart } from "@/src/app/lib/week";

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

    let succeeded = 0;
    let failed = 0;
    for (const userId of userIds) {
      try {
        const result = await adjustWeeklyPlan({ weekStart }, userId);
        if (result.status === 200) {
          succeeded += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      processed: userIds.length,
      succeeded,
      failed,
    });
  });
}
