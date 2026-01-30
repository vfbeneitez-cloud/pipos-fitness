import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import SignInPage from "./page";

describe("GET /auth/signin", () => {
  it("renderiza el título y el botón Continuar con Google", () => {
    const html = renderToString(<SignInPage />);
    expect(html).toContain("Sign in to your account");
    expect(html).toContain("Continuar con Google");
  });
});
