import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns ok with version, env, nodeEnv, vercelEnv", async () => {
    const res = await GET();
    const body = (await res.json()) as {
      ok: boolean;
      version: string;
      env: string;
      nodeEnv: string;
      vercelEnv: string;
    };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.version).toBeDefined();
    expect(typeof body.nodeEnv).toBe("string");
    expect(body).toHaveProperty("vercelEnv");
    expect(["demo", "production", "preview", "development", "test"]).toContain(body.env);
  });
});
