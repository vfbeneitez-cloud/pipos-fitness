import { NextResponse } from "next/server";
import { checkRateLimit } from "./rateLimit";
import { logInfo, logWarn, logError } from "./logger";
import { trackEvent } from "./events";
import { rateLimitExceeded } from "@/src/server/api/errorResponse";

export async function withSensitiveRoute(
  req: Request,
  handler: (requestId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const path = new URL(req.url).pathname;

  const limit = await checkRateLimit(req);
  if (!limit.ok) {
    logWarn(requestId, "rate limit exceeded", { path });
    trackEvent("rate_limit", { path, retryAfter: limit.retryAfter ?? 60 }, { sentry: true });
    return rateLimitExceeded(limit.retryAfter ?? 60);
  }

  try {
    const res = await handler(requestId);
    logInfo(requestId, "request completed", {
      path,
      statusCode: res.status,
      durationMs: Date.now() - start,
    });
    return res;
  } catch (e) {
    logError(requestId, "request failed", { path, durationMs: Date.now() - start });
    throw e;
  }
}
