import { NextResponse } from "next/server";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { trackEvent } from "@/src/server/lib/events";
import { recomputeWeeklySnapshot } from "@/src/server/api/adherence/snapshotRecompute";
import { toNextResponse } from "@/src/server/api/errorResponse";
import { parseWeekStartParam } from "@/src/server/api/adherence/weekRange";

const RECOMPUTE_RATE_LIMIT_MAX = 10;

export async function POST(req: Request) {
  return withSensitiveRoute(
    req,
    async () => {
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

      trackEvent("adherence_recompute_clicked", {
        endpoint: "/api/adherence/snapshot/recompute",
        weekStart: weekStartStr,
      });

      const result = await recomputeWeeklySnapshot(userId, weekStartStr);
      return toNextResponse(result);
    },
    { maxRequests: RECOMPUTE_RATE_LIMIT_MAX },
  );
}
