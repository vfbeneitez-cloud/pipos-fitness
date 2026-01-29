import { describe, it, expect } from "vitest";
import { GET } from "./route";

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
