import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";

const originalEnv = process.env;

vi.mock("@/src/server/lib/withSensitiveRoute", () => ({
  withSensitiveRoute: (_req: Request, handler: () => Promise<Response>) => handler(),
}));
vi.mock("@/src/server/db/prisma", () => ({
  prisma: {
    userProfile: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock("@/src/server/ai/agentWeeklyPlan", () => ({
  adjustWeeklyPlan: vi.fn(),
}));
vi.mock("@/src/app/lib/week", () => ({
  getWeekStart: () => "2026-01-27",
}));

const { prisma } = await import("@/src/server/db/prisma");
const { adjustWeeklyPlan } = await import("@/src/server/ai/agentWeeklyPlan");

describe("POST /api/cron/weekly-regenerate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("returns 404 when CRON_WEEKLY_REGEN_ENABLED is not true", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "false";
    process.env.CRON_SECRET = "secret";
    const req = new Request("http://localhost/api/cron/weekly-regenerate", {
      method: "POST",
      headers: { "x-cron-secret": "secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 404 when CRON_WEEKLY_REGEN_ENABLED is unset", async () => {
    delete process.env.CRON_WEEKLY_REGEN_ENABLED;
    process.env.CRON_SECRET = "secret";
    const req = new Request("http://localhost/api/cron/weekly-regenerate", {
      method: "POST",
      headers: { "x-cron-secret": "secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 401 when x-cron-secret is missing", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    process.env.CRON_SECRET = "secret";
    const req = new Request("http://localhost/api/cron/weekly-regenerate", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 401 when x-cron-secret does not match CRON_SECRET", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    process.env.CRON_SECRET = "secret";
    const req = new Request("http://localhost/api/cron/weekly-regenerate", {
      method: "POST",
      headers: { "x-cron-secret": "wrong" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 401 when CRON_SECRET is unset", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    delete process.env.CRON_SECRET;
    const req = new Request("http://localhost/api/cron/weekly-regenerate", {
      method: "POST",
      headers: { "x-cron-secret": "anything" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("accepts Authorization Bearer header (Vercel injects CRON_SECRET there)", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    process.env.CRON_SECRET = "cron-secret";
    vi.mocked(prisma.userProfile.findMany).mockResolvedValue([]);
    const req = new Request("http://localhost/api/cron/weekly-regenerate", {
      method: "POST",
      headers: { Authorization: "Bearer cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; processed: number };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
  });

  it("returns 200 with summary when valid secret and flag", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    process.env.CRON_SECRET = "cron-secret";
    vi.mocked(prisma.userProfile.findMany).mockResolvedValue([
      { userId: "user-1" },
      { userId: "user-2" },
    ] as never[]);
    vi.mocked(adjustWeeklyPlan)
      .mockResolvedValueOnce({
        status: 200,
        body: { plan: {} as never, rationale: "" },
      } as never)
      .mockResolvedValueOnce({
        status: 400,
        body: { error: "INVALID_BODY", details: {} as never },
      } as never);

    const req = new Request("http://localhost/api/cron/weekly-regenerate", {
      method: "POST",
      headers: { "x-cron-secret": "cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      processed: number;
      succeeded: number;
      failed: number;
    };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(2);
    expect(body.succeeded).toBe(1);
    expect(body.failed).toBe(1);
  });

  it("returns 200 with processed 0 when no users have profile", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    process.env.CRON_SECRET = "cron-secret";
    vi.mocked(prisma.userProfile.findMany).mockResolvedValue([]);

    const req = new Request("http://localhost/api/cron/weekly-regenerate", {
      method: "POST",
      headers: { "x-cron-secret": "cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      processed: number;
      succeeded: number;
      failed: number;
    };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.succeeded).toBe(0);
    expect(body.failed).toBe(0);
  });

  it("increments failed when adjustWeeklyPlan throws", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    process.env.CRON_SECRET = "cron-secret";
    vi.mocked(prisma.userProfile.findMany).mockResolvedValue([{ userId: "user-1" }] as never[]);
    vi.mocked(adjustWeeklyPlan).mockRejectedValueOnce(new Error("db error"));

    const req = new Request("http://localhost/api/cron/weekly-regenerate", {
      method: "POST",
      headers: { "x-cron-secret": "cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      processed: number;
      succeeded: number;
      failed: number;
    };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.succeeded).toBe(0);
    expect(body.failed).toBe(1);
  });
});
