import { NextResponse } from "next/server";
import { setupDemo } from "@/src/server/api/demo/setup";

export async function POST(req: Request) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "DEMO_DISABLED" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const result = await setupDemo(body);
  return NextResponse.json(result.body, { status: result.status });
}
