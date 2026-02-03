import { NextResponse } from "next/server";
import { createWeeklyPlan, getWeeklyPlan } from "@/src/server/api/weeklyPlan/route";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { badRequestBody } from "@/src/server/api/errorResponse";
import { trackEvent } from "@/src/server/lib/events";

// Vercel: 60s max (requires Pro plan, Hobby = 10s)
export const maxDuration = 60;

export async function GET(req: Request) {
  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      trackEvent("weekly_plan_get_unauthorized", { status: 401 }, { sentry: true });
      return authResult;
    }
    const { userId } = authResult;
    try {
      const result = await getWeeklyPlan(req.url, userId);
      if (result.status === 400) {
        trackEvent("weekly_plan_get_badRequest", { status: 400 });
        const errBody = result.body as { error?: string };
        return NextResponse.json(badRequestBody(errBody.error ?? "INVALID_QUERY"), { status: 400 });
      }
      trackEvent("weekly_plan_get_success", { status: 200 });
      return NextResponse.json(result.body, { status: result.status });
    } catch (e) {
      trackEvent("weekly_plan_get_error", { status: 500 }, { sentry: true });
      throw e;
    }
  });
}

export async function POST(req: Request) {
  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(badRequestBody("INVALID_JSON"), { status: 400 });
    }
    const result = await createWeeklyPlan(body, userId);
    if (result.status === 400) {
      const errBody = result.body as { error?: string };
      return NextResponse.json(badRequestBody(errBody.error ?? "INVALID_INPUT"), { status: 400 });
    }
    return NextResponse.json(result.body, { status: result.status });
  });
}
