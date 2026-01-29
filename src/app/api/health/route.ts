import { NextResponse } from "next/server";

export async function GET() {
  const isDemoMode = process.env.DEMO_MODE === "true";
  const nodeEnv = process.env.NODE_ENV ?? "";
  const vercelEnv = process.env.VERCEL_ENV ?? "";
  const env = isDemoMode ? "demo" : vercelEnv || nodeEnv || "production";
  return NextResponse.json({
    ok: true,
    version: process.env.npm_package_version || "0.1.0",
    env,
    nodeEnv,
    vercelEnv: vercelEnv || "",
  });
}
