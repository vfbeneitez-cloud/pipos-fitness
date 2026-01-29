import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/src/server/lib/requireAuth", () => ({
  requireAuth: vi.fn(),
}));
vi.mock("@/src/server/lib/withSensitiveRoute", () => ({
  withSensitiveRoute: (_req: Request, handler: () => Promise<Response>) => handler(),
}));
vi.mock("@/src/server/api/profile/upsertProfile", () => ({
  upsertProfile: vi.fn().mockResolvedValue({ status: 200, body: { ok: true } }),
}));

const { requireAuth } = await import("@/src/server/lib/requireAuth");

describe("POST /api/profile", () => {
  it("returns 401 when no session", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
    );
    const req = new Request("http://localhost/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: "BEGINNER", daysPerWeek: 3 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 when session exists and body valid", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: "user-1" });
    const req = new Request("http://localhost/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: "health",
        level: "BEGINNER",
        daysPerWeek: 3,
        sessionMinutes: 45,
        environment: "GYM",
        mealsPerDay: 3,
        cookingTime: "MIN_20",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
