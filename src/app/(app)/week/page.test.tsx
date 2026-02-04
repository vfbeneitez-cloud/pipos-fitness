/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { renderToString } from "react-dom/server";
import { createRoot } from "react-dom/client";
import WeekPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe("GET /week", () => {
  it("renderiza título Semana actual en carga", () => {
    const html = renderToString(React.createElement(WeekPage));
    expect(html).toContain("Semana actual");
  });

  it("muestra panel de última actualización y Ver motivo cuando plan tiene lastRationale", async () => {
    const weekStart = "2026-01-27";
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/weekly-plan")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: "p1",
                userId: "u1",
                weekStart,
                status: "DRAFT",
                trainingJson: { sessions: [] },
                nutritionJson: { days: [] },
                lastRationale: "Ajustes aplicados según adherencia.",
                lastGeneratedAt: "2026-01-27T10:00:00.000Z",
              }),
          });
        }
        if (url.includes("/api/adherence/snapshot") && !url.includes("recompute")) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () =>
              Promise.resolve({
                error_code: "SNAPSHOT_NOT_FOUND",
                message: "Snapshot no encontrado.",
              }),
          });
        }
        if (url.includes("/api/adherence/weekly")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                training: { planned: 0, completed: 0, percent: 0 },
                nutrition: { planned: 0, completed: 0, percent: 0 },
                totalPercent: 0,
              }),
          });
        }
        if (url.includes("/api/adherence/summary")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                goalPercent: 70,
                streak: { currentStreakWeeks: 0, goalPercent: 70 },
                nudge: {
                  type: "BEHIND_GOAL",
                  severity: "medium",
                  title: "Por debajo del objetivo",
                  detail: "0% vs objetivo 70%.",
                },
                trend: { items: [], missing: [] },
                alerts: [],
              }),
          });
        }
        if (url.includes("/api/adherence/insights-ai")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                insights: [],
                nextAction: { type: "KEEP_GOING", title: "Sigue así", detail: "Mantén el ritmo." },
                coach: null,
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
      root.render(React.createElement(WeekPage));
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(container.textContent).toMatch(/Última actualización del plan/i);
    expect(container.textContent).toMatch(/Ver motivo/i);
    root.unmount();
    document.body.removeChild(container);
  });
});
