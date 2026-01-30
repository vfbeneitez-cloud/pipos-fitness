import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("@/src/server/auth/getSession", () => ({
  getUserIdFromSession: vi.fn(),
}));
const mockRedirect = vi.fn(() => {
  const err = new Error("NEXT_REDIRECT");
  (err as unknown as { digest: string }).digest = "NEXT_REDIRECT;/auth/signin";
  throw err;
});
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));
vi.mock("@/src/app/components/Nav", () => ({
  Nav: () => null,
}));

const { getUserIdFromSession } = await import("@/src/server/auth/getSession");
const Layout = (await import("./layout")).default;

describe("(app) layout", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
  });

  it("sin sesión → redirect /auth/signin", async () => {
    vi.mocked(getUserIdFromSession).mockResolvedValue(null);
    await expect(Layout({ children: React.createElement("div", null, "child") })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("con sesión → render children", async () => {
    vi.mocked(getUserIdFromSession).mockResolvedValue("user-1");
    const result = await Layout({
      children: React.createElement("div", { "data-testid": "child" }, "child content"),
    });
    expect(result).toBeDefined();
    expect(React.isValidElement(result)).toBe(true);
    const str = JSON.stringify(result);
    expect(str).toContain("child content");
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
