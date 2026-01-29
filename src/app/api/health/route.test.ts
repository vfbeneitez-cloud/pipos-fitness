import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns ok with version and env", async () => {
    const res = await GET();
    const body = (await res.json()) as { ok: boolean; version: string; env: string };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.version).toBeDefined();
    expect(["demo", "production"]).toContain(body.env);
  });
});
