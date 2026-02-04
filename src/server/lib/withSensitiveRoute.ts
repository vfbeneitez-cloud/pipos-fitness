import { NextResponse } from "next/server";
import { checkRateLimit } from "./rateLimit";
import { logInfo, logWarn, logError } from "./logger";
import { trackEvent } from "./events";
import { rateLimitExceeded } from "@/src/server/api/errorResponse";

export type WithSensitiveRouteOptions = { maxRequests?: number };

export async function withSensitiveRoute(
  req: Request,
  handler: (requestId: string) => Promise<NextResponse>,
  options?: WithSensitiveRouteOptions,
): Promise<NextResponse> {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const path = new URL(req.url).pathname;

  const limit = await checkRateLimit(req, {
    maxRequests: options?.maxRequests,
  });
  if (!limit.ok) {
    logWarn(requestId, "rate limit exceeded", { path });
    trackEvent("rate_limit", { path, retryAfter: limit.retryAfter ?? 60 }, { sentry: true });
    const res = rateLimitExceeded(limit.retryAfter ?? 60);
    res.headers.set("x-request-id", requestId);
    return res;
  }

  try {
    const res = await handler(requestId);
    res.headers.set("x-request-id", requestId);
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
