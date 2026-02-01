import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";

const originalEnv = process.env;

vi.mock("@/src/server/lib/withSensitiveRoute", () => ({
  withSensitiveRoute: (_req: Request, handler: () => Promise<Response>) => handler(),
}));
vi.mock("@/src/server/db/prisma", () => ({
  prisma: {
    userProfile: { findMany: vi.fn() },
    weeklyPlan: { updateMany: vi.fn() },
  },
}));
vi.mock("@/src/server/ai/agentWeeklyPlan", () => ({
  adjustWeeklyPlan: vi.fn(),
}));
vi.mock("@/src/app/lib/week", () => ({
  getWeekStart: () => "2026-01-27",
}));
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

const { prisma } = await import("@/src/server/db/prisma");
const { adjustWeeklyPlan } = await import("@/src/server/ai/agentWeeklyPlan");
const Sentry = await import("@sentry/nextjs");

describe("POST /api/cron/weekly-regenerate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(Sentry.captureMessage).mockClear();
    vi.mocked(prisma.weeklyPlan.updateMany).mockClear();
    vi.mocked(adjustWeeklyPlan).mockClear();
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
    const body = (await res.json()) as { error_code: string; message: string };
    expect(body.error_code).toBe("UNAUTHORIZED");
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
    const body = (await res.json()) as { error_code: string; message: string };
    expect(body.error_code).toBe("UNAUTHORIZED");
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
    const body = (await res.json()) as { ok: boolean; processed: number; skippedLocked: number };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.skippedLocked).toBe(0);
  });

  it("returns 200 with summary when valid secret and flag", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    process.env.CRON_SECRET = "cron-secret";
    vi.mocked(prisma.userProfile.findMany).mockResolvedValue([
      { userId: "user-1" },
      { userId: "user-2" },
    ] as never[]);
    vi.mocked(prisma.weeklyPlan.updateMany).mockResolvedValue({ count: 1 });
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
      skippedLocked: number;
    };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(2);
    expect(body.succeeded).toBe(1);
    expect(body.failed).toBe(1);
    expect(body.skippedLocked).toBe(0);
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
      skippedLocked: number;
    };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.succeeded).toBe(0);
    expect(body.failed).toBe(0);
    expect(body.skippedLocked).toBe(0);
  });

  it("increments failed when adjustWeeklyPlan throws", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    process.env.CRON_SECRET = "cron-secret";
    vi.mocked(prisma.userProfile.findMany).mockResolvedValue([{ userId: "user-1" }] as never[]);
    vi.mocked(prisma.weeklyPlan.updateMany).mockResolvedValue({ count: 1 });
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
      skippedLocked: number;
    };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.succeeded).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.skippedLocked).toBe(0);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith("cron.weekly-regenerate partial failure", {
      level: "error",
      extra: { processed: 1, succeeded: 0, failed: 1, skippedLocked: 0 },
    });
  });

  it("calls captureMessage with warning when partial failure (some succeed, some fail)", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    process.env.CRON_SECRET = "cron-secret";
    vi.mocked(prisma.userProfile.findMany).mockResolvedValue([
      { userId: "user-1" },
      { userId: "user-2" },
    ] as never[]);
    vi.mocked(prisma.weeklyPlan.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(adjustWeeklyPlan)
      .mockResolvedValueOnce({ status: 200, body: {} as never } as never)
      .mockRejectedValueOnce(new Error("db error"));

    const req = new Request("http://localhost/api/cron/weekly-regenerate", {
      method: "POST",
      headers: { "x-cron-secret": "cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith("cron.weekly-regenerate partial failure", {
      level: "warning",
      extra: { processed: 2, succeeded: 1, failed: 1, skippedLocked: 0 },
    });
  });

  it("does not call captureMessage when all succeed", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    process.env.CRON_SECRET = "cron-secret";
    vi.mocked(prisma.userProfile.findMany).mockResolvedValue([
      { userId: "user-1" },
      { userId: "user-2" },
    ] as never[]);
    vi.mocked(prisma.weeklyPlan.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(adjustWeeklyPlan)
      .mockResolvedValueOnce({ status: 200, body: {} as never } as never)
      .mockResolvedValueOnce({ status: 200, body: {} as never } as never);

    const req = new Request("http://localhost/api/cron/weekly-regenerate", {
      method: "POST",
      headers: { "x-cron-secret": "cron-secret" },
    });
    await POST(req);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("when lock not acquired, skippedLocked increments and adjustWeeklyPlan not called", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    process.env.CRON_SECRET = "cron-secret";
    vi.mocked(prisma.userProfile.findMany).mockResolvedValue([{ userId: "user-1" }] as never[]);
    vi.mocked(prisma.weeklyPlan.updateMany).mockResolvedValue({ count: 0 });

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
      skippedLocked: number;
    };
    expect(body.processed).toBe(1);
    expect(body.skippedLocked).toBe(1);
    expect(body.succeeded).toBe(0);
    expect(body.failed).toBe(0);
    expect(adjustWeeklyPlan).not.toHaveBeenCalled();
    expect(prisma.weeklyPlan.updateMany).toHaveBeenCalledTimes(1);
  });

  it("when lock acquired, adjustWeeklyPlan called and release attempted", async () => {
    process.env.CRON_WEEKLY_REGEN_ENABLED = "true";
    process.env.CRON_SECRET = "cron-secret";
    vi.mocked(prisma.userProfile.findMany).mockResolvedValue([{ userId: "user-1" }] as never[]);
    vi.mocked(prisma.weeklyPlan.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(adjustWeeklyPlan).mockResolvedValue({ status: 200, body: {} as never } as never);

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
      skippedLocked: number;
    };
    expect(body.succeeded).toBe(1);
    expect(body.skippedLocked).toBe(0);
    expect(adjustWeeklyPlan).toHaveBeenCalledTimes(1);
    expect(prisma.weeklyPlan.updateMany).toHaveBeenCalledTimes(2);
  });
});
