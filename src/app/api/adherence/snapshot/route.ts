import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { getWeeklySnapshot } from "@/src/server/api/adherence/snapshotGet";
import { toNextResponse } from "@/src/server/api/errorResponse";
import { parseWeekStartParam } from "@/src/server/api/adherence/weekRange";

export async function GET(req: Request) {
  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const u = new URL(req.url);
    const weekStartStr = u.searchParams.get("weekStart") ?? "";
    const parsed = parseWeekStartParam(weekStartStr);

    if (!parsed.ok) {
      return NextResponse.json(
        { error: "INVALID_QUERY", error_code: "INVALID_QUERY", message: "weekStart inválido." },
        { status: 400 },
      );
    }

    const result = await getWeeklySnapshot(userId, parsed.weekStartUtc);
    return toNextResponse(result);
  });
}
