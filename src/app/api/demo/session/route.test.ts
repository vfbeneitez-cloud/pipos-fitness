import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/demo/session", () => {
  it("returns 403 when DEMO_MODE=false", async () => {
    const originalDemoMode = process.env.DEMO_MODE;
    process.env.DEMO_MODE = "false";

    try {
      const res = await GET();
      const body = (await res.json()) as { error: string };

      expect(res.status).toBe(403);
      expect(body.error).toBe("DEMO_DISABLED");
    } finally {
      process.env.DEMO_MODE = originalDemoMode;
    }
  });
});
