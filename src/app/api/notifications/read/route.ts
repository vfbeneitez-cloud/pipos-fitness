import { z } from "zod";
import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { markNotificationRead } from "@/src/server/api/notifications/markRead";
import { toNextResponse } from "@/src/server/api/errorResponse";

const BodyZ = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  if (process.env.NOTIFICATIONS_ENABLED !== "true") {
    return NextResponse.json(null, { status: 404 });
  }

  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const body = await req.json().catch(() => ({}));
    const parsed = BodyZ.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", error_code: "INVALID_BODY", message: "id requerido." },
        { status: 400 },
      );
    }

    const result = await markNotificationRead(userId, parsed.data.id);
    return toNextResponse(result);
  });
}
