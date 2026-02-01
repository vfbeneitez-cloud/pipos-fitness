import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/src/server/db/prisma";
import { createTrainingLog } from "./log";

const TEST_USER_ID = "test-user-id";

vi.mock("@/src/server/auth/getSession", () => ({
  getUserIdFromSession: async () => TEST_USER_ID,
}));

describe("POST /api/training/log", () => {
  beforeEach(async () => {
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: "test@local.test" },
    });
  });
  it("creates a training log successfully", async () => {
    const result = await createTrainingLog(
      {
        completed: true,
        difficulty: "ok",
        pain: false,
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(200);
    const body = result.body as { id: string; userId: string; completed: boolean };
    expect(body.id).toBeDefined();
    expect(body.userId).toBe(TEST_USER_ID);
    expect(body.completed).toBe(true);
  });

  it("creates log with planId", async () => {
    const plan = await prisma.weeklyPlan.upsert({
      where: {
        userId_weekStart: {
          userId: TEST_USER_ID,
          weekStart: new Date("2026-01-26T00:00:00.000Z"),
        },
      },
      update: {},
      create: {
        userId: TEST_USER_ID,
        weekStart: new Date("2026-01-26T00:00:00.000Z"),
        status: "DRAFT",
        trainingJson: {},
        nutritionJson: {},
      },
    });

    const result = await createTrainingLog(
      {
        planId: plan.id,
        completed: true,
        pain: false,
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(200);
    const body = result.body as { planId: string | null };
    expect(body.planId).toBe(plan.id);
  });

  it("returns 400 for invalid body", async () => {
    const result = await createTrainingLog(
      {
        completed: "not-boolean" as unknown as boolean,
        difficulty: "invalid" as unknown as "easy" | "ok" | "hard",
        pain: false,
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(400);
    expect((result.body as { error: string }).error).toBe("INVALID_BODY");
  });

  it("returns 404 for non-existent planId", async () => {
    const result = await createTrainingLog(
      {
        planId: "non-existent-plan-id",
        completed: true,
        pain: false,
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(404);
    expect((result.body as { error: string }).error).toBe("PLAN_NOT_FOUND");
  });

  it("creates log for day without session (Entrenamiento libre)", async () => {
    const result = await createTrainingLog(
      {
        completed: true,
        difficulty: "ok",
        pain: false,
        sessionName: "Entrenamiento libre",
        dayIndex: 3,
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(200);
    const body = result.body as { id: string; sessionName: string | null };
    expect(body.id).toBeDefined();
    expect(body.sessionName).toBe("Entrenamiento libre");
  });

  it("creates log without sessionName, defaults to Entrenamiento libre", async () => {
    const result = await createTrainingLog(
      {
        completed: true,
        pain: false,
        dayIndex: 2,
      },
      TEST_USER_ID,
    );

    expect(result.status).toBe(200);
    const body = result.body as { id: string; sessionName: string | null };
    expect(body.id).toBeDefined();
    expect(body.sessionName).toBe("Entrenamiento libre");
  });
});

describe("POST /api/training/log authorization", () => {
  beforeEach(async () => {
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, email: "test@local.test" },
    });
  });

  it("returns 401 when no session", async () => {
    vi.resetModules();
    vi.doMock("@/src/server/auth/getSession", () => ({
      getUserIdFromSession: async () => null,
    }));
    const { POST } = await import("@/src/app/api/training/log/route");

    const req = new Request("http://localhost/api/training/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completed: true,
        pain: false,
      }),
    });
    const res = await POST(req);
    const body = (await res.json()) as { error_code: string; message: string };

    expect(res.status).toBe(401);
    expect(body.error_code).toBe("UNAUTHORIZED");
  });

  it("returns 200 when session exists", async () => {
    vi.resetModules();
    vi.doMock("@/src/server/auth/getSession", () => ({
      getUserIdFromSession: async () => TEST_USER_ID,
    }));
    const { POST } = await import("@/src/app/api/training/log/route");

    const req = new Request("http://localhost/api/training/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completed: true,
        pain: false,
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});
