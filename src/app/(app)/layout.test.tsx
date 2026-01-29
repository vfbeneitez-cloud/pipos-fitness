import { describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("@/src/server/auth/getSession", () => ({
  getUserIdFromSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    const err = new Error("NEXT_REDIRECT");
    (err as unknown as { digest: string }).digest = "NEXT_REDIRECT;/auth/signin";
    throw err;
  }),
}));
vi.mock("@/src/app/components/Nav", () => ({
  Nav: () => null,
}));

const { getUserIdFromSession } = await import("@/src/server/auth/getSession");
const Layout = (await import("./layout")).default;

describe("(app) layout", () => {
  it("redirige a /auth/signin cuando no hay sesión (DEMO_MODE=false)", async () => {
    vi.mocked(getUserIdFromSession).mockResolvedValue(null);
    await expect(Layout({ children: React.createElement("div", null, "child") })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
  });
});
