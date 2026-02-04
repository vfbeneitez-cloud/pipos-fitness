/**
 * Response cache for GET /api/exercises. Uses Upstash Redis when env is set.
 * Stale OK: on Redis failure we return null (caller serves from DB).
 */

import { trackEvent } from "./events";
import { logWarn } from "./logger";

const CACHE_PREFIX = "exercises";
const CACHE_VERSION = "v1";
const CACHE_TTL_SEC = 600; // 10 min

/** Normalize query string for stable cache key: sort params by key. */
export function normalizeExercisesQueryString(searchParams: URLSearchParams): string {
  const entries = Array.from(searchParams.entries()).filter(
    ([k]) => k === "environment" || k === "q",
  );
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return new URLSearchParams(entries).toString();
}

export function exercisesCacheKey(normalizedQuery: string): string {
  return `${CACHE_PREFIX}:${CACHE_VERSION}:${normalizedQuery || "_"}`;
}

export async function getExercisesCached(
  key: string,
  requestId?: string,
): Promise<string | null> {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });
    const raw = await redis.get<string>(key);
    return typeof raw === "string" ? raw : null;
  } catch (err) {
    trackEvent(
      "api_exercises_outcome",
      {
        endpoint: "/api/exercises",
        outcome: "cache_get_failed",
        ...(requestId && { requestId }),
      },
      { sentry: true },
    );
    logWarn(requestId ?? "no-request-id", "exercises cache get failed", {
      error: String(err),
    });
    return null;
  }
}

export async function setExercisesCached(
  key: string,
  value: string,
  requestId?: string,
): Promise<void> {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return;
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });
    await redis.set(key, value, { ex: CACHE_TTL_SEC });
  } catch (err) {
    trackEvent(
      "api_exercises_outcome",
      {
        endpoint: "/api/exercises",
        outcome: "cache_set_failed",
        ...(requestId && { requestId }),
      },
      { sentry: true },
    );
    logWarn(requestId ?? "no-request-id", "exercises cache set failed", {
      error: String(err),
    });
  }
}
