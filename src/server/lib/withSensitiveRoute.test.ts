import { NextResponse } from "next/server";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { withSensitiveRoute } from "./withSensitiveRoute";

vi.mock("./rateLimit", () => ({
  checkRateLimit: vi.fn(),
}));

const { checkRateLimit } = await import("./rateLimit");

describe("withSensitiveRoute", () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: true });
  });

  it("returns 429 with Retry-After when rate limit exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, retryAfter: 42 });
    const req = new Request("http://localhost/api/weekly-plan", { method: "POST" });
    const res = await withSensitiveRoute(req, async () => NextResponse.json({}));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("RATE_LIMIT_EXCEEDED");
  });
});
