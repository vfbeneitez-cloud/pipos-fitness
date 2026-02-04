import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { getAdherenceSummary } from "@/src/server/api/adherence/summary";
import { toNextResponse } from "@/src/server/api/errorResponse";

export async function GET(req: Request) {
  return withSensitiveRoute(
    req,
    async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const result = await getAdherenceSummary(userId, req.url);
    return toNextResponse(result);
  },
  { maxRequests: 60 },
  );
}
