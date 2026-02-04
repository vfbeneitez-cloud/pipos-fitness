import { NextResponse } from "next/server";
import { getExercises } from "@/src/server/api/exercises/route";
import { checkRateLimit } from "@/src/server/lib/rateLimit";
import { rateLimitExceeded } from "@/src/server/api/errorResponse";
import { logWarn } from "@/src/server/lib/logger";
import { trackEvent } from "@/src/server/lib/events";

const EXERCISES_RATE_LIMIT_MAX = 60; // requests per minute per IP

export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const path = "/api/exercises";

  const limit = await checkRateLimit(req, { maxRequests: EXERCISES_RATE_LIMIT_MAX });
  if (!limit.ok) {
    logWarn(requestId, "rate limit exceeded", { path, retryAfter: limit.retryAfter ?? 60 });
    trackEvent(
      "api_exercises_outcome",
      {
        endpoint: "/api/exercises",
        outcome: "rate_limited",
        requestId,
        retryAfter: limit.retryAfter ?? 60,
      },
      { sentry: true },
    );
    const res = rateLimitExceeded(limit.retryAfter ?? 60);
    res.headers.set("x-request-id", requestId);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  const res = await getExercises(req, { requestId });
  // Public endpoint: enable CDN caching + SWR
  // 10 min CDN cache, allow stale while revalidating for 1 day
  res.headers.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");
  res.headers.set("x-request-id", requestId);
  return res;
}
