import { describe, it, expect } from "vitest";
import { getDemoSession } from "./session";
import { setupDemo } from "./setup";

describe("POST /api/demo/setup", () => {
  it("accepts empty body and returns userId", async () => {
    await getDemoSession();
    const result = await setupDemo({});
    expect(result.status).toBe(200);
    const body = result.body as { userId: string };
    expect(body.userId).toBeDefined();
  });

  it("accepts profile body and returns userId", async () => {
    const result = await setupDemo({
      goal: "test",
      level: "INTERMEDIATE",
      daysPerWeek: 4,
      sessionMinutes: 60,
      environment: "HOME",
      mealsPerDay: 4,
      cookingTime: "MIN_20",
    });
    expect(result.status).toBe(200);
    const body = result.body as { userId: string };
    expect(body.userId).toBeDefined();
  });

  it("returns 400 for invalid body", async () => {
    const result = await setupDemo({
      daysPerWeek: 10,
      sessionMinutes: 5,
    });
    expect(result.status).toBe(400);
    expect((result.body as { error: string }).error).toBe("INVALID_BODY");
  });
});
