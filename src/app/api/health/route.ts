import { NextResponse } from "next/server";

export async function GET() {
  const isDemoMode = process.env.DEMO_MODE === "true";
  return NextResponse.json({
    ok: true,
    version: process.env.npm_package_version || "0.1.0",
    env: isDemoMode ? "demo" : "production",
  });
}
