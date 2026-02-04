import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { toNextResponse } from "@/src/server/api/errorResponse";
import { upsertSubscription } from "@/src/server/api/notifications/push/handlers";

function pushDisabled() {
  return NextResponse.json(
    { error_code: "FEATURE_DISABLED", message: "Las notificaciones push no están disponibles." },
    { status: 404 },
  );
}

export async function POST(req: Request) {
  if (process.env.NOTIFICATIONS_PUSH_ENABLED !== "true") {
    return pushDisabled();
  }

  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error_code: "INVALID_BODY", message: "Body JSON inválido." },
        { status: 400 },
      );
    }

    const userAgent = req.headers.get("user-agent");
    const result = await upsertSubscription(userId, body, userAgent);
    return toNextResponse(result);
  });
}
