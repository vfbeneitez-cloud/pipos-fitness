import { NextResponse } from "next/server";
import { swapMeal } from "@/src/server/api/nutrition/swap";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { badRequestBody } from "@/src/server/api/errorResponse";
import { trackEvent } from "@/src/server/lib/events";

export async function POST(req: Request) {
  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      trackEvent("nutrition_swap_post_badRequest", { status: 400 });
      return NextResponse.json(badRequestBody("INVALID_JSON"), { status: 400 });
    }
    const result = await swapMeal(body, userId);
    if (result.status !== 200) {
      trackEvent("nutrition_swap_post_error", { status: result.status }, { sentry: true });
    } else {
      trackEvent("nutrition_swap_post_success", { status: 200 });
    }
    if (result.status === 400) {
      const errBody = result.body as { error?: string; message?: string };
      return NextResponse.json(
        {
          error_code: errBody.error ?? "INVALID_INPUT",
          message: errBody.message ?? "Revisa los datos e inténtalo de nuevo.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(result.body, { status: result.status });
  });
}
