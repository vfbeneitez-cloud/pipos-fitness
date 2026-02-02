import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { SignInClient } from "./SignInClient";

describe("GET /auth/signin", () => {
  it("renderiza el título y el botón Continuar con Google cuando Google está habilitado", () => {
    const html = renderToString(<SignInClient googleAuthEnabled={true} error={null} />);
    expect(html).toContain("Inicia sesión");
    expect(html).toContain("Continuar con Google");
  });

  it("muestra mensaje de no disponible cuando Google no está habilitado", () => {
    const html = renderToString(<SignInClient googleAuthEnabled={false} error={null} />);
    expect(html).toContain("Inicia sesión");
    expect(html).toContain("El acceso con Google no está disponible ahora mismo");
    expect(html).not.toContain("Continuar con Google");
  });
});
