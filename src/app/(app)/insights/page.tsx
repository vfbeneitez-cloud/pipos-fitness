"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LoadingSkeleton } from "@/src/app/components/LoadingSkeleton";

type TrendItem = {
  weekStart: string;
  computedAt?: string;
  trainingPercent: number;
  nutritionPercent: number;
  totalPercent: number;
};

type AdherenceAlert = {
  type: string;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  weeks?: string[];
};

type SummaryData = {
  goalPercent: number;
  streak: { currentStreakWeeks: number; goalPercent: number; bestStreakWeeks?: number };
  currentWeek: {
    weekStart: string;
    totalPercent: number;
    trainingPercent: number;
    nutritionPercent: number;
    source: string;
  } | null;
  previousWeek?: { weekStart: string; totalPercent: number };
  nudge: { type: string; severity: string; title: string; detail: string };
  trend: { items: TrendItem[]; missing: string[] };
  alerts: AdherenceAlert[];
};

const RECOMPUTE_MISSING_CAP = 12;

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function InsightsPage() {
  const [data, setData] = useState<SummaryData | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [recomputingWeek, setRecomputingWeek] = useState<string | null>(null);
  const [recomputingMissing, setRecomputingMissing] = useState(false);
  const [goalLoading, setGoalLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    setError(null);
    setData(undefined);
    try {
      const res = await fetch("/api/adherence/summary?weeks=8");
      const json = (await res.json()) as SummaryData | { error_code?: string };
      if (!res.ok) {
        setError((json as { message?: string }).message ?? "Error al cargar.");
        setData(null);
        return;
      }
      setData(json as SummaryData);
    } catch {
      setError("Error de red. Reintenta.");
      setData(null);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleRecomputeWeek = useCallback(
    async (weekStart: string) => {
      if (recomputingWeek || recomputingMissing) return;
      setRecomputingWeek(weekStart);
      setError(null);
      try {
        const res = await fetch(`/api/adherence/snapshot/recompute?weekStart=${weekStart}`, {
          method: "POST",
        });
        if (res.ok) {
          await fetchSummary();
        } else if (res.status === 429) {
          setError("Espera un minuto antes de volver a intentar.");
        }
      } catch {
        setError("Error de red.");
      } finally {
        setRecomputingWeek(null);
      }
    },
    [fetchSummary, recomputingWeek, recomputingMissing],
  );

  const handleRecomputeMissing = useCallback(async () => {
    if (!data?.trend?.missing?.length || recomputingMissing || recomputingWeek) return;
    setRecomputingMissing(true);
    setError(null);
    const toRecompute = data.trend.missing.slice(0, RECOMPUTE_MISSING_CAP);
    try {
      for (const weekStart of toRecompute) {
        const res = await fetch(`/api/adherence/snapshot/recompute?weekStart=${weekStart}`, {
          method: "POST",
        });
        if (res.status === 429) {
          setError("Espera un minuto. Rate limit alcanzado.");
          break;
        }
      }
      await fetchSummary();
    } catch {
      setError("Error de red.");
    } finally {
      setRecomputingMissing(false);
    }
  }, [data?.trend?.missing, fetchSummary, recomputingMissing, recomputingWeek]);

  if (data === undefined) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Tendencia de adherencia
        </h1>
        <LoadingSkeleton />
      </main>
    );
  }

  if (data === null) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Tendencia de adherencia
        </h1>
        {error && (
          <div
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
            role="alert"
          >
            {error}
          </div>
        )}
      </main>
    );
  }

  const latest = data.trend.items[0];
  const prev = data.trend.items[1];
  const delta =
    latest && prev && Number.isFinite(latest.totalPercent) && Number.isFinite(prev.totalPercent)
      ? latest.totalPercent - prev.totalPercent
      : null;

  return (
    <main className="mx-auto max-w-lg px-4 py-8 pb-20">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Tendencia de adherencia
      </h1>

      {error && (
        <div
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {data.trend.missing.length > 0 && (
        <section className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
            Faltan {data.trend.missing.length} semana(s) por calcular
            {data.trend.missing.length <= 12
              ? `: ${data.trend.missing.join(", ")}`
              : ` (se recalcularán hasta ${RECOMPUTE_MISSING_CAP})`}
          </p>
          <button
            type="button"
            onClick={handleRecomputeMissing}
            disabled={recomputingMissing}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600 disabled:opacity-50"
          >
            {recomputingMissing ? "Calculando…" : "Recalcular faltantes"}
          </button>
        </section>
      )}

      <section className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Objetivo</h2>
        <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
          Objetivo semanal: {data.goalPercent}%
        </p>
        <div className="flex items-center gap-2">
          {/* API acepta 0-100; UI limita a 50-100 por decisión de producto */}
          <select
            value={data.goalPercent}
            onChange={async (e) => {
              const val = parseInt(e.target.value, 10);
              if (Number.isNaN(val) || val < 0 || val > 100) return;
              setGoalLoading(true);
              try {
                const res = await fetch("/api/adherence/goal", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ goalPercent: val }),
                });
                if (res.ok) await fetchSummary();
              } finally {
                setGoalLoading(false);
              }
            }}
            disabled={goalLoading}
            className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 disabled:opacity-50"
          >
            {[50, 60, 70, 80, 90, 100].map((p) => (
              <option key={p} value={p}>
                {p}%
              </option>
            ))}
          </select>
          <span className="text-xs text-zinc-500">
            Racha: {data.streak.currentStreakWeeks} semana(s)
          </span>
        </div>
      </section>

      {data.nudge && (
        <section
          className={`mb-6 rounded-lg border p-4 ${
            data.nudge.severity === "high"
              ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
              : data.nudge.severity === "medium"
                ? "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800/50"
                : "border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-900/10"
          }`}
        >
          <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Nudge</h2>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{data.nudge.title}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{data.nudge.detail}</p>
        </section>
      )}

      {data.trend.items.length > 0 && (
        <>
          <section className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Resumen</h2>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {latest!.totalPercent}%
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Última semana ({formatDate(latest!.weekStart)})
              {delta !== null ? (
                <span
                  className={
                    delta >= 0
                      ? " text-green-600 dark:text-green-400"
                      : " text-amber-600 dark:text-amber-400"
                  }
                >
                  {" "}
                  {delta >= 0 ? "+" : ""}
                  {delta} pts vs anterior
                </span>
              ) : (
                <span className="text-zinc-500"> — Sin comparación (necesitas 2+ semanas)</span>
              )}
            </p>
          </section>

          <section className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Gráfico</h2>
            <div className="flex h-24 items-end gap-1">
              {data.trend.items
                .slice()
                .reverse()
                .map((item) => (
                  <div
                    key={item.weekStart}
                    className="flex flex-1 flex-col items-center gap-0.5"
                    title={`${item.weekStart}: ${item.totalPercent}%`}
                  >
                    <div
                      className="w-full min-w-[4px] rounded-t bg-zinc-300 dark:bg-zinc-600"
                      style={{ height: `${Math.max(4, item.totalPercent)}%` }}
                    />
                    <span className="hidden text-[10px] text-zinc-500 sm:inline">
                      {item.weekStart.slice(5)}
                    </span>
                  </div>
                ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              totalPercent por semana (orden cronológico)
            </p>
          </section>

          {data.alerts.length > 0 && (
            <section className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Alertas</h2>
              <ul className="space-y-2">
                {data.alerts.map((alert, i) => (
                  <li
                    key={`${alert.type}-${i}`}
                    className={`rounded-lg border p-3 ${
                      alert.severity === "high"
                        ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                        : alert.severity === "medium"
                          ? "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800/50"
                          : "border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-900/10"
                    }`}
                  >
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        alert.severity === "high"
                          ? "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100"
                          : alert.severity === "medium"
                            ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                            : "bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100"
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                      {alert.title}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {alert.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Semanas</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">
                      Semana
                    </th>
                    <th className="py-2 text-right text-zinc-600 dark:text-zinc-400">Entr.</th>
                    <th className="py-2 text-right text-zinc-600 dark:text-zinc-400">Nutr.</th>
                    <th className="py-2 text-right text-zinc-600 dark:text-zinc-400">Total</th>
                    <th className="py-2 text-right text-zinc-600 dark:text-zinc-400">
                      Actualizado
                    </th>
                    <th className="py-2 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {data.trend.items.map((item) => (
                    <tr
                      key={item.weekStart}
                      className="border-b border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="py-2 font-medium">{formatDate(item.weekStart)}</td>
                      <td className="py-2 text-right">{item.trainingPercent}%</td>
                      <td className="py-2 text-right">{item.nutritionPercent}%</td>
                      <td className="py-2 text-right font-medium">{item.totalPercent}%</td>
                      <td className="py-2 text-right text-xs text-zinc-500">
                        {item.computedAt != null
                          ? new Date(item.computedAt).toLocaleString("es-ES", {
                              dateStyle: "short",
                              timeStyle: "short",
                              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                            })
                          : "—"}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRecomputeWeek(item.weekStart)}
                          disabled={recomputingWeek !== null || recomputingMissing}
                          className="text-xs text-zinc-600 underline hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          {recomputingWeek === item.weekStart ? "…" : "Recalcular"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {data.trend.items.length === 0 && data.trend.missing.length === 0 && (
        <p className="text-zinc-600 dark:text-zinc-400">
          No hay datos de tendencia. Crea un plan semanal y registra entrenamientos/comidas para
          generar snapshots.
        </p>
      )}

      {data.trend.items.length === 0 && data.trend.missing.length > 0 && (
        <p className="text-zinc-600 dark:text-zinc-400">
          Usa &quot;Recalcular faltantes&quot; después de crear planes y logs para las semanas.
        </p>
      )}

      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/week" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
          ← Volver a Semana
        </Link>
      </p>
    </main>
  );
}
