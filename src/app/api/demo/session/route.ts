import { NextResponse } from "next/server";
import { getDemoSession } from "@/src/server/api/demo/session";

export async function GET() {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "DEMO_DISABLED" }, { status: 403 });
  }
  const result = await getDemoSession();
  return NextResponse.json(result.body, { status: result.status });
}
