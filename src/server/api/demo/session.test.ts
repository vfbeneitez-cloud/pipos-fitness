import { describe, it, expect } from "vitest";
import { getDemoSession } from "./session";

describe("GET /api/demo/session", () => {
  it("returns userId for demo user", async () => {
    const result = await getDemoSession();
    expect(result.status).toBe(200);
    const body = result.body as { userId: string };
    expect(body.userId).toBeDefined();
    expect(typeof body.userId).toBe("string");
  });
});
