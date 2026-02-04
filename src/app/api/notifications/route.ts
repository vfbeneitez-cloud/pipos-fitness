import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { listNotifications } from "@/src/server/api/notifications/list";
import { toNextResponse } from "@/src/server/api/errorResponse";

export async function GET(req: Request) {
  if (process.env.NOTIFICATIONS_ENABLED !== "true") {
    return NextResponse.json(null, { status: 404 });
  }

  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const u = new URL(req.url);
    const unreadOnly = u.searchParams.get("unreadOnly") === "1";
    const limit = parseInt(u.searchParams.get("limit") ?? "30", 10) || 30;

    const result = await listNotifications(userId, { limit, unreadOnly });
    return toNextResponse(result);
  });
}
