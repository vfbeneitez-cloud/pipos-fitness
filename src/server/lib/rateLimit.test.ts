import { vi, beforeEach, describe, it, expect } from "vitest";
import { checkRateLimit } from "./rateLimit";

const MAX_REQUESTS = 30;

const redisMock = {
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
};

vi.mock("@upstash/redis", () => ({
  Redis: function Redis() {
    return redisMock;
  },
}));

const originalEnv = process.env;

function makeReq(url = "http://localhost/api/weekly-plan", ip = "1.2.3.4") {
  return new Request(url, {
    headers: { "x-forwarded-for": ip },
  });
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("Redis path: when incr returns 31 and ttl 45, returns ok: false and retryAfter 45", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    redisMock.incr.mockResolvedValue(31);
    redisMock.ttl.mockResolvedValue(45);
    const result = await checkRateLimit(makeReq());
    expect(result.ok).toBe(false);
    expect(result.retryAfter).toBe(45);
  });

  it("Redis path: when incr returns 30, returns ok: true", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    redisMock.incr.mockResolvedValue(30);
    const result = await checkRateLimit(makeReq());
    expect(result.ok).toBe(true);
    expect(result.retryAfter).toBeUndefined();
  });

  it("fallback: without Upstash env, 31st request for same route+ip returns ok: false and retryAfter", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const uniquePath = `/rl-fallback-${Date.now()}`;
    const req = makeReq(`http://localhost${uniquePath}`);
    for (let i = 0; i < MAX_REQUESTS; i++) {
      const r = await checkRateLimit(req);
      expect(r.ok).toBe(true);
    }
    const r = await checkRateLimit(req);
    expect(r.ok).toBe(false);
    expect(r.retryAfter).toBeDefined();
    expect(typeof r.retryAfter).toBe("number");
    expect(r.retryAfter).toBeGreaterThanOrEqual(1);
  });
});
