import { handlers } from "@/src/server/auth";
import { getGoogleOAuthConfig } from "@/src/server/auth/config";
import { trackEvent } from "@/src/server/lib/events";
import type { NextRequest } from "next/server";

function isGoogleAuthPath(pathname: string): boolean {
  return pathname.includes("/signin/google") || pathname.includes("/callback/google");
}

async function withErrorLog(
  req: NextRequest,
  handler: (
    req: NextRequest,
    context: { params: Promise<Record<string, string | string[]>> },
  ) => Promise<Response>,
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

function maybeRejectGoogle(req: NextRequest): Response | null {
  const pathname = req.nextUrl.pathname;
  if (!isGoogleAuthPath(pathname)) return null;
  if (getGoogleOAuthConfig()) return null;
  trackEvent("auth_google_not_configured", { route: "signin" }, { sentry: true });
  const signInUrl = new URL("/auth/signin", req.url);
  signInUrl.searchParams.set("error", "google_not_available");
  return Response.redirect(signInUrl, 302);
}

export function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string | string[]>> },
) {
  const reject = maybeRejectGoogle(req);
  if (reject) return reject;
  return withErrorLog(req, handlers.GET, context);
}

export function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string | string[]>> },
) {
  const reject = maybeRejectGoogle(req);
  if (reject) return reject;
  return withErrorLog(req, handlers.POST, context);
}
