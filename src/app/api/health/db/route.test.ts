import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health/db", () => {
  it("returns ok when DB is connected", async () => {
    const req = new Request("http://localhost/api/health/db");
    const res = await GET(req);
    const body = (await res.json()) as { ok: boolean };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
