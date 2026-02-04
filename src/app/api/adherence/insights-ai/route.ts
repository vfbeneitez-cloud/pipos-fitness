import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { getWeeklyAdherenceInsightsAiHandler } from "@/src/server/api/adherence/insightsAi";
import { toNextResponse } from "@/src/server/api/errorResponse";

export async function GET(req: Request) {
  return withSensitiveRoute(
    req,
    async () => {
      const authResult = await requireAuth();
      if (authResult instanceof NextResponse) return authResult;
      const { userId } = authResult;
      const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
      const result = await getWeeklyAdherenceInsightsAiHandler(req.url, userId, { requestId });
      const res = toNextResponse(result);
      res.headers.set("x-request-id", requestId);
      res.headers.set("Cache-Control", "private, no-store");
      return res;
    },
    { maxRequests: INSIGHTS_AI_RATE_LIMIT_MAX },
  );
}
