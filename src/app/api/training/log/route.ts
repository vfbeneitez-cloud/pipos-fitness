import { NextResponse } from "next/server";
import { createTrainingLog } from "@/src/server/api/training/log";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { badRequestBody, toNextResponse } from "@/src/server/api/errorResponse";
import { trackEvent } from "@/src/server/lib/events";

export async function POST(req: Request) {
  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      trackEvent("training_log_post_unauthorized", { status: 401 }, { sentry: true });
      return authResult;
    }
    const { userId } = authResult;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      trackEvent("training_log_post_badRequest", { status: 400 });
      return NextResponse.json(badRequestBody("INVALID_JSON"), { status: 400 });
    }
    const result = await createTrainingLog(body, userId);
    if (result.status === 400) {
      trackEvent("training_log_post_badRequest", { status: 400 });
      const errBody = result.body as { error?: string };
      return NextResponse.json(badRequestBody(errBody.error ?? "INVALID_INPUT"), { status: 400 });
    }
    if (result.status === 404) {
      trackEvent("training_log_plan_not_found");
    }
    if (result.status === 200) {
      trackEvent("training_log_post_success", { status: 200 });
    }
    return toNextResponse(result);
  });
}
