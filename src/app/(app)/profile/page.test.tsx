/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import React, { act } from "react";
import { renderToString } from "react-dom/server";
import { createRoot } from "react-dom/client";
import ProfilePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe("GET /profile", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ profile: null }),
        }),
      ),
    );
  });

  it("renderiza título Perfil en estado carga", () => {
    const html = renderToString(React.createElement(ProfilePage));
    expect(html).toContain("Perfil");
  });

  it("muestra CTA a onboarding cuando profile es null", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(ProfilePage));
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(container.textContent).toMatch(/onboarding|Ir a onboarding/i);
    root.unmount();
    document.body.removeChild(container);
  });

  it("muestra formulario y botón Guardar cuando hay profile", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          profile: {
            id: "p1",
            userId: "u1",
            goal: null,
            level: "BEGINNER",
            daysPerWeek: 3,
            sessionMinutes: 45,
            environment: "GYM",
            equipmentNotes: null,
            injuryNotes: null,
            dietaryStyle: null,
            allergies: null,
            dislikes: null,
            cookingTime: "MIN_20",
            mealsPerDay: 3,
          },
        }),
    } as Response);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(ProfilePage));
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(container.textContent).toContain("Guardar cambios");
    expect(container.textContent).toContain("Regenerar plan de esta semana");
    root.unmount();
    document.body.removeChild(container);
  });

  it("abre modal al hacer clic en Regenerar plan", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          profile: {
            id: "p1",
            userId: "u1",
            goal: null,
            level: "BEGINNER",
            daysPerWeek: 3,
            sessionMinutes: 45,
            environment: "GYM",
            equipmentNotes: null,
            injuryNotes: null,
            dietaryStyle: null,
            allergies: null,
            dislikes: null,
            cookingTime: "MIN_20",
            mealsPerDay: 3,
          },
        }),
    } as Response);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(ProfilePage));
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const buttons = container.querySelectorAll("button");
    const regenButton = Array.from(buttons).find((b) =>
      b.textContent?.includes("Regenerar plan de esta semana"),
    );
    expect(regenButton).toBeDefined();
    await act(async () => {
      regenButton?.click();
    });
    expect(container.textContent).toMatch(/Se regenerará|Confirmar|Cancelar/);
    root.unmount();
    document.body.removeChild(container);
  });

  it("Save llama PUT /api/profile", async () => {
    const mockFetch = vi.fn();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            profile: {
              id: "p1",
              userId: "u1",
              goal: null,
              level: "BEGINNER",
              daysPerWeek: 3,
              sessionMinutes: 45,
              environment: "GYM",
              equipmentNotes: null,
              injuryNotes: null,
              dietaryStyle: null,
              allergies: null,
              dislikes: null,
              cookingTime: "MIN_20",
              mealsPerDay: 3,
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            profile: {
              id: "p1",
              userId: "u1",
              level: "BEGINNER",
              daysPerWeek: 3,
              sessionMinutes: 45,
              environment: "GYM",
              cookingTime: "MIN_20",
              mealsPerDay: 3,
            },
          }),
      });
    vi.stubGlobal("fetch", mockFetch);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(ProfilePage));
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const saveBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Guardar cambios"),
    );
    expect(saveBtn).toBeDefined();
    await act(async () => {
      saveBtn?.click();
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/profile",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      }),
    );
    root.unmount();
    document.body.removeChild(container);
  });
});
