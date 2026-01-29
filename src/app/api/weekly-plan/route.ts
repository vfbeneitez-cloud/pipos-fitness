import { NextResponse } from "next/server";
import { createWeeklyPlan, getWeeklyPlan } from "@/src/server/api/weeklyPlan/route";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";

export async function GET(req: Request) {
  return withSensitiveRoute(req, async () => {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;
    const result = await getWeeklyPlan(req.url, userId);
    return NextResponse.json(result.body, { status: result.status });
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
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }
    const result = await createWeeklyPlan(body, userId);
    return NextResponse.json(result.body, { status: result.status });
  });
}
