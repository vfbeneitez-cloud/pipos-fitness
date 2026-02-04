import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { trackEvent } from "@/src/server/lib/events";
import { getGoal, setGoal } from "@/src/server/api/adherence/goal";
import { toNextResponse } from "@/src/server/api/errorResponse";

export async function GET(req: Request) {
  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const result = await getGoal(userId);
    return toNextResponse(result);
  });
}

export async function POST(req: Request) {
  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const body = await req.json().catch(() => ({}));
    const result = await setGoal(userId, body);

    if (result.status === 200) {
      const resBody = result.body as { goalPercent: number };
      trackEvent("adherence_goal_updated", { goalPercent: resBody.goalPercent });
    }

    return toNextResponse(result);
  });
}
