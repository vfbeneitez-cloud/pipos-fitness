import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { trackEvent } from "@/src/server/lib/events";
import { getExercisesCached } from "@/src/server/lib/exercisesCache";

vi.mock("@/src/server/lib/exercisesCache", () => ({
  normalizeExercisesQueryString: (params: URLSearchParams) => new URLSearchParams(params).toString(),
  exercisesCacheKey: (q: string) => `exercises:v1:${q || "_"}`,
  getExercisesCached: vi.fn().mockResolvedValue(null),
  setExercisesCached: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/src/server/lib/events", () => ({ trackEvent: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getExercisesCached).mockResolvedValue(null);
});

describe("GET /api/exercises", () => {
  it("returns exercises", async () => {
    const req = new Request("http://localhost/api/exercises");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);

    // Should include media array (can be empty if seed changed, but in our seed it's present)
    expect(json[0]).toHaveProperty("media");
  });

  it("includes Cache-Control header on 200", async () => {
    const req = new Request("http://localhost/api/exercises");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const cacheControl = res.headers.get("Cache-Control");
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("s-maxage=600");
    expect(cacheControl).toContain("stale-while-revalidate=86400");
  });

  it("on cache hit: returns 200 with Cache-Control, Content-Type json, and emits cache_hit", async () => {
    const cachedJson = '[{"id":"1","name":"Test","environment":"GYM","slug":"test","media":[]}]';
    vi.mocked(getExercisesCached).mockResolvedValueOnce(cachedJson);

    const req = new Request("http://localhost/api/exercises");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=600, stale-while-revalidate=86400",
    );
    expect(res.headers.get("Content-Type")).toBe("application/json");
    const body = await res.text();
    expect(body).toBe(cachedJson);

    expect(trackEvent).toHaveBeenCalledWith("api_exercises_outcome", {
      endpoint: "/api/exercises",
      outcome: "cache_hit",
    });
  });

  it("on cache corrupt: falls through to DB, returns 200 with Cache-Control and emits cache_miss_corrupt", async () => {
    vi.mocked(getExercisesCached).mockResolvedValueOnce('{"'); // invalid JSON

    const req = new Request("http://localhost/api/exercises");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBeDefined();
    expect(res.headers.get("Cache-Control")).toContain("public");

    expect(trackEvent).toHaveBeenCalledWith(
      "api_exercises_outcome",
      expect.objectContaining({ outcome: "cache_miss_corrupt" }),
    );
  });

  it("filters by environment", async () => {
    const req = new Request("http://localhost/api/exercises?environment=GYM");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.every((e: { environment: string }) => e.environment === "GYM")).toBe(true);
  });

  it("rejects invalid environment", async () => {
    const req = new Request("http://localhost/api/exercises?environment=NOPE");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("INVALID_QUERY");
  });

  it("rejects invalid query param q (too long)", async () => {
    const longQuery = "a".repeat(51);
    const req = new Request(`http://localhost/api/exercises?q=${longQuery}`);
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("INVALID_QUERY");
  });
});
