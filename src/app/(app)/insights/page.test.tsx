/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import React, { act } from "react";
import { renderToString } from "react-dom/server";
import { createRoot } from "react-dom/client";
import InsightsPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe("GET /insights", () => {
  it("renderiza título Tendencia de adherencia en carga", () => {
    const html = renderToString(React.createElement(InsightsPage));
    expect(html).toContain("Tendencia de adherencia");
  });

  it("muestra resumen y tabla cuando hay items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/adherence/summary")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                goalPercent: 70,
                streak: { currentStreakWeeks: 1, goalPercent: 70 },
                currentWeek: {
                  weekStart: "2026-01-27",
                  totalPercent: 84,
                  trainingPercent: 100,
                  nutritionPercent: 67,
                  source: "snapshot",
                },
                nudge: {
                  type: "ON_TRACK",
                  severity: "low",
                  title: "Objetivo cumplido",
                  detail: "84% esta semana.",
                },
                trend: {
                  items: [
                    {
                      weekStart: "2026-01-27",
                      computedAt: "2026-01-27T10:00:00.000Z",
                      trainingPercent: 100,
                      nutritionPercent: 67,
                      totalPercent: 84,
                    },
                  ],
                  missing: [],
                },
                alerts: [],
              }),
          });
        }
        return Promise.reject(new Error("unknown url"));
      }),
    );
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(InsightsPage));
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(container.textContent).toMatch(/84%/);
    expect(container.textContent).toMatch(/Semanas/);
    root.unmount();
    document.body.removeChild(container);
  });
});
