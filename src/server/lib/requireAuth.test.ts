import { describe, it, expect, beforeEach, vi } from "vitest";
import { getUserIdFromSession } from "@/src/server/auth/getSession";
import { prisma } from "@/src/server/db/prisma";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/src/server/auth", () => ({
  auth: () => mockAuth(),
}));

describe("getUserIdFromSession", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it("returns demo user in DEMO_MODE when no session", async () => {
    process.env.DEMO_MODE = "true";
    mockAuth.mockResolvedValue(null);

    const userId = await getUserIdFromSession();
    expect(userId).toBeTruthy();
    const user = await prisma.user.findUnique({ where: { id: userId! } });
    expect(user?.email).toBe("demo@pipos.local");
  });

  it("returns null in production when no session", async () => {
    process.env.DEMO_MODE = "false";
    mockAuth.mockResolvedValue(null);

    const userId = await getUserIdFromSession();
    expect(userId).toBeNull();
  });

  it("returns userId from session when authenticated", async () => {
    process.env.DEMO_MODE = "false";
    const user = await prisma.user.upsert({
      where: { email: "auth-test@local.test" },
      update: {},
      create: { email: "auth-test@local.test" },
    });

    mockAuth.mockResolvedValue({
      user: { email: "auth-test@local.test" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const userId = await getUserIdFromSession();
    expect(userId).toBe(user.id);
  });
});
