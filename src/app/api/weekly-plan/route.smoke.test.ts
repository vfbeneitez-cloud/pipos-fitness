import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/src/server/lib/requireAuth", () => ({
  requireAuth: vi.fn(),
}));
vi.mock("@/src/server/api/weeklyPlan/route", () => ({
  getWeeklyPlan: vi.fn().mockResolvedValue({ status: 200, body: null }),
  createWeeklyPlan: vi.fn(),
}));
vi.mock("@/src/server/lib/withSensitiveRoute", () => ({
  withSensitiveRoute: (_req: Request, handler: () => Promise<NextResponse>) => handler(),
}));

const { requireAuth } = await import("@/src/server/lib/requireAuth");

describe("smoke: protected route (week data)", () => {
  it("unauthenticated GET /api/weekly-plan -> 401 (equivalent to redirect for /week)", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
    );
    const req = new Request("http://localhost/api/weekly-plan?weekStart=2026-01-27");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("authenticated GET /api/weekly-plan -> 200", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: "user-1" });
    const req = new Request("http://localhost/api/weekly-plan?weekStart=2026-01-27");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
