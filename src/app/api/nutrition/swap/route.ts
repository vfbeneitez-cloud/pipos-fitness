import { NextResponse } from "next/server";
import { swapMeal } from "@/src/server/api/nutrition/swap";
import { withSensitiveRoute } from "@/src/server/lib/withSensitiveRoute";
import { requireAuth } from "@/src/server/lib/requireAuth";

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
    const result = await swapMeal(body, userId);
    return NextResponse.json(result.body, { status: result.status });
  });
}
