import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { getUnreadCount } from "@/src/server/api/notifications/unreadCount";
import { toNextResponse } from "@/src/server/api/errorResponse";

export async function GET(req: Request) {
  if (process.env.NOTIFICATIONS_ENABLED !== "true") {
    return NextResponse.json(null, { status: 404 });
  }

  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const result = await getUnreadCount(userId);
    return toNextResponse(result);
  });
}
