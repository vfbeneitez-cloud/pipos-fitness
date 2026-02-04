import { describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  logger: { info: vi.fn() },
}));

const { GET } = await import("./route");

function setEnv(env: Record<string, string>) {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    prev[key] = process.env[key];
    process.env[key] = env[key];
  }
  return () => {
    for (const key of Object.keys(env)) {
      if (prev[key] !== undefined) process.env[key] = prev[key];
      else delete process.env[key];
    }
  };
}

describe("GET /api/_debug/sentry", () => {
  it("returns 404 in production (VERCEL_ENV=production)", async () => {
    const restore = setEnv({
      VERCEL_ENV: "production",
      NODE_ENV: "development",
      SENTRY_DEBUG: "true",
    });
    try {
      const res = await GET();
      expect(res.status).toBe(404);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    } finally {
      restore();
    }
  });

  it("returns 404 in production (NODE_ENV=production)", async () => {
    const restore = setEnv({
      VERCEL_ENV: "preview",
      NODE_ENV: "production",
      SENTRY_DEBUG: "true",
    });
    try {
      const res = await GET();
      expect(res.status).toBe(404);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    } finally {
      restore();
    }
  });

  it("returns 200 in preview with SENTRY_DEBUG=true", async () => {
    const restore = setEnv({
      VERCEL_ENV: "preview",
      NODE_ENV: "development",
      SENTRY_DEBUG: "true",
    });
    try {
      const res = await GET();
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      const body = (await res.json()) as { ok: boolean; message: string };
      expect(body.ok).toBe(true);
      expect(body.message).toContain("Sentry");
    } finally {
      restore();
    }
  });

  it("returns 404 in preview without SENTRY_DEBUG", async () => {
    const restore = setEnv({
      VERCEL_ENV: "preview",
      NODE_ENV: "development",
      SENTRY_DEBUG: "false",
    });
    try {
      const res = await GET();
      expect(res.status).toBe(404);
    } finally {
      restore();
    }
  });
});
