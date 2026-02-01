import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import OnboardingPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe("GET /onboarding", () => {
  it("renderiza el wizard cuando hay sesión (layout ya validó)", () => {
    const html = renderToString(<OnboardingPage />);
    expect(html).toContain("Bienvenido");
    expect(html).toContain("Empezar");
    expect(html).toContain("Pipos Fitness");
    expect(html).toContain("Evita incluir datos personales en las notas.");
  });
});
