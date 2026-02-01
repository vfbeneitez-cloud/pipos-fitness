import { describe, expect, it, vi } from "vitest";
import { unauthorized } from "@/src/server/api/errorResponse";
import { GET, PUT } from "./route";

vi.mock("@/src/server/lib/requireAuth", () => ({
  requireAuth: vi.fn(),
}));
vi.mock("@/src/server/lib/withSensitiveRoute", () => ({
  withSensitiveRoute: (_req: Request, handler: () => Promise<Response>) => handler(),
}));
vi.mock("@/src/server/api/profile/handlers", () => ({
  getProfile: vi.fn(),
  upsertProfile: vi.fn(),
}));

const { requireAuth } = await import("@/src/server/lib/requireAuth");
const { getProfile, upsertProfile } = await import("@/src/server/api/profile/handlers");

describe("GET /api/profile", () => {
  it("returns 401 when no session", async () => {
    vi.mocked(requireAuth).mockResolvedValue(unauthorized());
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with profile: null when profile missing", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: "user-1" });
    vi.mocked(getProfile).mockResolvedValue(null);
    const res = await GET();
    const data = (await res.json()) as { profile: null };
    expect(res.status).toBe(200);
    expect(data.profile).toBeNull();
  });

  it("returns 200 with profile when profile exists", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: "user-1" });
    const mockProfile = {
      id: "prof-1",
      userId: "user-1",
      level: "BEGINNER",
      daysPerWeek: 3,
      sessionMinutes: 45,
      environment: "GYM",
      cookingTime: "MIN_20",
      mealsPerDay: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(getProfile).mockResolvedValue(mockProfile as never);
    const res = await GET();
    const data = (await res.json()) as { profile: unknown };
    expect(res.status).toBe(200);
    expect(data.profile).toMatchObject({
      id: "prof-1",
      userId: "user-1",
      level: "BEGINNER",
      daysPerWeek: 3,
      sessionMinutes: 45,
      environment: "GYM",
      cookingTime: "MIN_20",
      mealsPerDay: 3,
    });
  });
});

describe("PUT /api/profile", () => {
  it("returns 401 when no session", async () => {
    vi.mocked(requireAuth).mockResolvedValue(unauthorized());
    const req = new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daysPerWeek: 4 }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 INVALID_INPUT for invalid body", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: "user-1" });
    const req = new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daysPerWeek: 99 }),
    });
    const res = await PUT(req);
    const data = (await res.json()) as { error_code: string; message: string };
    expect(res.status).toBe(400);
    expect(data.error_code).toBe("INVALID_INPUT");
  });

  it("returns 200 with profile when body valid", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: "user-1" });
    const mockProfile = {
      id: "prof-1",
      userId: "user-1",
      level: "BEGINNER",
      daysPerWeek: 4,
      sessionMinutes: 45,
      environment: "GYM",
      cookingTime: "MIN_20",
      mealsPerDay: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(upsertProfile).mockResolvedValue(mockProfile as never);
    const req = new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: "health",
        level: "BEGINNER",
        daysPerWeek: 4,
        sessionMinutes: 45,
        environment: "GYM",
        mealsPerDay: 3,
        cookingTime: "MIN_20",
      }),
    });
    const res = await PUT(req);
    const data = (await res.json()) as { profile: unknown };
    expect(res.status).toBe(200);
    expect(data.profile).toMatchObject({
      id: "prof-1",
      userId: "user-1",
      level: "BEGINNER",
      daysPerWeek: 4,
      sessionMinutes: 45,
      environment: "GYM",
      cookingTime: "MIN_20",
      mealsPerDay: 3,
    });
  });
});
