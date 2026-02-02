import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackEvent } from "@/src/server/lib/events";
import { NextRequest } from "next/server";

vi.mock("@/src/server/lib/events", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/src/server/auth/config", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/src/server/auth/config");
  return {
    ...actual,
    getGoogleOAuthConfig: () => null,
  };
});

vi.mock("@/src/server/auth", () => ({
  handlers: {
    GET: async () => new Response(),
    POST: async () => new Response(),
  },
}));

const { GET, POST } = await import("@/src/app/api/auth/[...nextauth]/route");

const context = { params: Promise.resolve({}) };

function makeReq(url: string, method: "GET" | "POST" = "GET") {
  return new NextRequest(url, { method });
}

describe("NextAuth route guard - google not configured", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/auth/signin/google redirects to /auth/signin?error=google_not_available", async () => {
    const req = makeReq("http://localhost:3000/api/auth/signin/google", "GET");
    const res = await GET(req, context);

    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? res.headers.get("Location") ?? "";
    expect(location).toContain("/auth/signin?error=google_not_available");

    expect(trackEvent).toHaveBeenCalledWith(
      "auth_google_not_configured",
      expect.objectContaining({ route: "signin" }),
      expect.objectContaining({ sentry: true }),
    );
  });

  it("GET /api/auth/callback/google redirects to /auth/signin?error=google_not_available", async () => {
    const req = makeReq("http://localhost:3000/api/auth/callback/google", "GET");
    const res = await GET(req, context);

    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? res.headers.get("Location") ?? "";
    expect(location).toContain("/auth/signin?error=google_not_available");

    expect(trackEvent).toHaveBeenCalledWith(
      "auth_google_not_configured",
      expect.objectContaining({ route: "signin" }),
      expect.objectContaining({ sentry: true }),
    );
  });

  it("POST /api/auth/signin/google redirects to /auth/signin?error=google_not_available", async () => {
    const req = makeReq("http://localhost:3000/api/auth/signin/google", "POST");
    const res = await POST(req, context);

    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? res.headers.get("Location") ?? "";
    expect(location).toContain("/auth/signin?error=google_not_available");
  });
});
