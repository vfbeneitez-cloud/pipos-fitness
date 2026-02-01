import { handlers } from "@/src/server/auth";
import type { NextRequest } from "next/server";

async function withErrorLog(
  req: NextRequest,
  handler: (req: NextRequest, context: { params: Promise<Record<string, string | string[]>> }) => Promise<Response>,
  context: { params: Promise<Record<string, string | string[]>> },
) {
  try {
    return await handler(req, context);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[Auth] Route error:", message, stack ?? "");
    throw e;
  }
}

export function GET(req: NextRequest, context: { params: Promise<Record<string, string | string[]>> }) {
  return withErrorLog(req, handlers.GET, context);
}

export function POST(req: NextRequest, context: { params: Promise<Record<string, string | string[]>> }) {
  return withErrorLog(req, handlers.POST, context);
}
