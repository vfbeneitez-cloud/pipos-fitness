import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { getWeeklyAdherence } from "@/src/server/api/adherence/weekly";
import { toNextResponse } from "@/src/server/api/errorResponse";

export async function GET(req: Request) {
  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    const result = await getWeeklyAdherence(req.url, userId);
    return toNextResponse(result);
  });
}
