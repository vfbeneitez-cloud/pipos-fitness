import { NextResponse } from "next/server";
import { adjustWeeklyPlan } from "@/src/server/ai/agentWeeklyPlan";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";
import { badRequest } from "@/src/server/api/errorResponse";

export async function GET() {
  return NextResponse.json({
    hint: 'Use POST with body: { weekStart: "YYYY-MM-DD" }. Requires auth.',
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
      return badRequest("INVALID_JSON");
    }
    const result = await adjustWeeklyPlan(body, userId);
    return NextResponse.json(result.body, { status: result.status });
  });
}
