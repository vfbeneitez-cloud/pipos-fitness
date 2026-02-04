/**
 * Rate limit by IP (and route when using Redis). Uses Upstash Redis when env vars
 * are set (distributed); otherwise in-memory per instance (see specs/07).
 */

const WINDOW_SEC = 60;
const DEFAULT_MAX_REQUESTS = 30;

export type RateLimitOptions = { maxRequests?: number };

type Result = { ok: boolean; retryAfter?: number };

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

function getRoute(req: Request): string {
  try {
    return new URL(req.url).pathname;
  } catch {
    return "/";
  }
}

// In-memory fallback
type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

function checkInMemory(route: string, ip: string, maxRequests: number): Result {
  const key = `rl:${route}:${ip}`;
  const now = Date.now();
  const windowMs = WINDOW_SEC * 1000;
  let entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { ok: true };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true };
}

async function checkRedis(route: string, ip: string, maxRequests: number): Promise<Result> {
  const { Redis } = await import("@upstash/redis");
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return checkInMemory(route, ip, maxRequests);

  const redis = new Redis({ url, token });
  const key = `rl:${route}:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SEC);
  }
  if (count > maxRequests) {
    const ttl = await redis.ttl(key);
    return { ok: false, retryAfter: Math.max(1, ttl) };
  }
  return { ok: true };
}

export async function checkRateLimit(
  req: Request,
  options: RateLimitOptions = {},
): Promise<Result> {
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const route = getRoute(req);
  const ip = getClientIp(req);

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return checkRedis(route, ip, maxRequests);
  }
  return Promise.resolve(checkInMemory(route, ip, maxRequests));
}
