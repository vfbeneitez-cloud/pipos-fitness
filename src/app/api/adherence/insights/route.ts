import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { getWeeklyAdherenceInsightsHandler } from "@/src/server/api/adherence/insights";
import { toNextResponse } from "@/src/server/api/errorResponse";

export async function GET(req: Request) {
  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    const result = await getWeeklyAdherenceInsightsHandler(req.url, userId);
    return toNextResponse(result);
  });
}
