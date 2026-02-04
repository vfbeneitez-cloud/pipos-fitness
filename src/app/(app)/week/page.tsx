"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { SLOT_LABEL } from "@/src/app/lib/slotLabels";
import { getWeekStart, DAY_NAMES } from "@/src/app/lib/week";
import { getErrorMessage } from "@/src/app/lib/errorMessage";
import { ErrorBanner } from "@/src/app/components/ErrorBanner";
import { LoadingSkeleton } from "@/src/app/components/LoadingSkeleton";

type TrainingSession = {
  dayIndex: number;
  name: string;
  exercises: Array<{ slug: string; name: string; sets: number; reps: string; restSec: number }>;
};

type NutritionDay = {
  dayIndex: number;
  meals: Array<{
    slot: string;
    title: string;
    minutes: number;
    tags: string[];
    ingredients: string[];
    instructions: string;
    substitutions: Array<{ title: string; minutes: number }>;
  }>;
};

type Plan = {
  id: string;
  userId: string;
  weekStart: string;
  status: string;
  trainingJson: { sessions: TrainingSession[] };
  nutritionJson: { days: NutritionDay[] };
  lastRationale?: string | null;
  lastGeneratedAt?: string | null;
};

type AdherenceData = {
  training: { planned: number; completed: number; percent: number };
  nutrition: { planned: number; completed: number; percent: number };
  totalPercent: number;
};

type InsightData = {
  type: string;
  severity: string;
  title: string;
  detail: string;
};

type NextActionData = {
  type: string;
  title: string;
  detail: string;
};

type CoachData = {
  summary: string;
  bullets: string[];
  nextActionTitle: string;
  nextActionSteps: string[];
};

type InsightsData = {
  insights: InsightData[];
  nextAction: NextActionData;
  coach?: CoachData | null;
};

export default function WeekPage() {
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [adherence, setAdherence] = useState<AdherenceData | null | undefined>(undefined);
  const [insights, setInsights] = useState<InsightsData | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenLoading, setRegenLoading] = useState(false);

  const weekStart = getWeekStart(new Date());
  const todayIndex = (new Date().getDay() + 6) % 7;

  const fetchPlan = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/weekly-plan?weekStart=${weekStart}`);
      const data = (await res.json()) as Plan | null | { error_code?: string; message?: string };
      if (!res.ok) {
        const err = data as { error_code?: string; message?: string; error?: string };
        setError(getErrorMessage(err, "Error al cargar el plan."));
        setPlan(null);
        return;
      }
      setPlan(data as Plan | null);
    } catch {
      setError("Error de red. Reintenta.");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  const handleRegenerate = useCallback(async () => {
    setRegenLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });
      const data = (await res.json()) as { error?: string; error_code?: string; message?: string };
      if (!res.ok) {
        setError(getErrorMessage(data, "Error al regenerar plan."));
        return;
      }
      await fetchPlan();
    } catch {
      setError("Error de red. Reintenta.");
    } finally {
      setRegenLoading(false);
    }
  }, [weekStart, fetchPlan]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const [adherenceComputedAt, setAdherenceComputedAt] = useState<string | null>(null);
  const [recomputeLoading, setRecomputeLoading] = useState(false);
  const [recomputeError, setRecomputeError] = useState<string | null>(null);
  const [nudge, setNudge] = useState<
    { type: string; severity: string; title: string; detail: string } | null | undefined
  >(undefined);

  const fetchAdherence = useCallback(async () => {
    if (!plan) return;
    setAdherence(undefined);
    setAdherenceComputedAt(null);
    try {
      const snapshotRes = await fetch(`/api/adherence/snapshot?weekStart=${weekStart}`);
      const snapshotData = (await snapshotRes.json()) as
        | {
            weekStart: string;
            computedAt: string;
            breakdown: {
              training: { planned: number; completed: number; percent: number };
              nutrition: { planned: number; completed: number; percent: number };
              totalPercent: number;
            };
          }
        | { error_code?: string };
      if (snapshotRes.ok && !("error_code" in snapshotData)) {
        const s = snapshotData as {
          breakdown: { training: unknown; nutrition: unknown; totalPercent: number };
        };
        setAdherence({
          training: s.breakdown.training as AdherenceData["training"],
          nutrition: s.breakdown.nutrition as AdherenceData["nutrition"],
          totalPercent: s.breakdown.totalPercent,
        });
        setAdherenceComputedAt((snapshotData as { computedAt: string }).computedAt);
        return;
      }
      if (
        snapshotRes.status === 404 &&
        (snapshotData as { error_code?: string }).error_code === "SNAPSHOT_NOT_FOUND"
      ) {
        const weeklyRes = await fetch(`/api/adherence/weekly?weekStart=${weekStart}`);
        const weeklyData = (await weeklyRes.json()) as AdherenceData | { error_code?: string };
        if (!weeklyRes.ok) {
          setAdherence(null);
          return;
        }
        setAdherence(weeklyData as AdherenceData);
        setAdherenceComputedAt(null);
        return;
      }
      setAdherence(null);
    } catch {
      setAdherence(null);
    }
  }, [plan, weekStart]);

  const fetchNudge = useCallback(async () => {
    try {
      const res = await fetch(`/api/adherence/summary?weeks=2&weekStart=${weekStart}`);
      const data = (await res.json()) as
        | { nudge?: { type: string; severity: string; title: string; detail: string } }
        | { error_code?: string };
      if (res.ok && data.nudge) {
        setNudge(data.nudge);
      } else {
        setNudge(null);
      }
    } catch {
      setNudge(null);
    }
  }, [weekStart]);

  const handleRecomputeAdherence = useCallback(async () => {
    if (recomputeLoading) return;
    setRecomputeLoading(true);
    setRecomputeError(null);
    try {
      const res = await fetch(`/api/adherence/snapshot/recompute?weekStart=${weekStart}`, {
        method: "POST",
      });
      if (res.ok) {
        setRecomputeError(null);
        await fetchAdherence();
        await fetchNudge();
      } else if (res.status === 429) {
        setRecomputeError("Espera un minuto antes de volver a intentar.");
      } else {
        const data = (await res.json()) as { message?: string };
        setRecomputeError(data.message ?? "Error al actualizar.");
      }
    } catch {
      setRecomputeError("Error de red. Reintenta.");
    } finally {
      setRecomputeLoading(false);
    }
  }, [weekStart, fetchAdherence, fetchNudge, recomputeLoading]);

  useEffect(() => {
    fetchAdherence();
  }, [fetchAdherence]);

  const fetchInsights = useCallback(async () => {
    if (!plan) return;
    setInsights(undefined);
    try {
      const res = await fetch(`/api/adherence/insights-ai?weekStart=${weekStart}`);
      const data = (await res.json()) as
        | { insights: InsightData[]; nextAction: NextActionData; coach?: CoachData | null }
        | { error_code?: string };
      if (!res.ok) {
        setInsights(null);
        return;
      }
      setInsights(data as InsightsData);
    } catch {
      setInsights(null);
    }
  }, [plan, weekStart]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  useEffect(() => {
    fetchNudge();
  }, [fetchNudge]);

  if (plan === undefined && loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Semana actual</h1>
        <LoadingSkeleton />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Semana actual
      </h1>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={fetchPlan} />
        </div>
      )}

      {plan === null && !error && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            Aún no tienes plan para esta semana.
          </p>
          <Link
            href="/onboarding"
            className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Generar plan
          </Link>
        </div>
      )}

      {nudge && (
        <section
          className={`mb-6 rounded-lg border p-4 ${
            nudge.severity === "high"
              ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
              : nudge.severity === "medium"
                ? "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800/50"
                : "border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-900/10"
          }`}
        >
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{nudge.title}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{nudge.detail}</p>
        </section>
      )}

      {plan && (
        <>
          {(() => {
            const sessions = plan.trainingJson?.sessions ?? [];
            const todaySession = sessions.find((s) => s.dayIndex === todayIndex);
            return (
              <section
                className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
                aria-labelledby="hoy-heading"
              >
                <h2
                  id="hoy-heading"
                  className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100"
                >
                  HOY · {todaySession ? DAY_NAMES[todayIndex] : "Día de descanso"}
                </h2>
                {todaySession ? (
                  <>
                    <p className="mb-3 text-zinc-700 dark:text-zinc-300">{todaySession.name}</p>
                    <Link
                      href={`/session/${todayIndex}`}
                      className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      Empezar entrenamiento
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                      El descanso es parte del plan. No hay sesión programada para hoy.
                    </p>
                    <Link
                      href={`/log/training?dayIndex=${todayIndex}`}
                      className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      Registrar entrenamiento igualmente
                    </Link>
                  </>
                )}
              </section>
            );
          })()}
          <AdherenceCard
            adherence={adherence}
            computedAt={adherenceComputedAt}
            onRecompute={handleRecomputeAdherence}
            recomputeLoading={recomputeLoading}
            recomputeError={recomputeError}
          />
          <InsightsCard insights={insights} />
          {plan.lastRationale != null && plan.lastRationale !== "" && (
            <RationalePanel rationale={plan.lastRationale} generatedAt={plan.lastGeneratedAt} />
          )}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenLoading}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600 disabled:opacity-50"
            >
              {regenLoading ? "Regenerando…" : "Regenerar plan con IA"}
            </button>
          </div>
          <section className="mb-8" aria-labelledby="training-heading">
            <h2 id="training-heading" className="mb-3 text-lg font-medium">
              Entrenamiento
            </h2>
            <ul className="space-y-2">
              {(plan.trainingJson?.sessions ?? []).map((s) => (
                <li key={s.dayIndex}>
                  <Link
                    href={`/session/${s.dayIndex}`}
                    className="block rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
                  >
                    <span className="font-medium">{DAY_NAMES[s.dayIndex]}</span> — {s.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Link
                href={`/log/training?dayIndex=${todayIndex}`}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
              >
                Registrar entrenamiento
              </Link>
            </div>
          </section>

          <section className="mb-8" aria-labelledby="nutrition-heading">
            <h2 id="nutrition-heading" className="mb-3 text-lg font-medium">
              Menú (hoy)
            </h2>
            <NutritionToday
              day={plan.nutritionJson?.days?.find((d) => d.dayIndex === todayIndex)}
              dayIndex={todayIndex}
              userId={plan.userId}
              weekStart={plan.weekStart}
            />
            <div className="mt-3">
              <Link
                href={`/log/nutrition?dayIndex=${todayIndex}`}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
              >
                Registrar comida
              </Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function AdherenceCard({
  adherence,
  computedAt,
  onRecompute,
  recomputeLoading,
  recomputeError,
}: {
  adherence: AdherenceData | null | undefined;
  computedAt?: string | null;
  onRecompute?: () => void;
  recomputeLoading?: boolean;
  recomputeError?: string | null;
}) {
  if (adherence === undefined) {
    return (
      <section
        className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
        aria-labelledby="adherence-heading"
      >
        <h2 id="adherence-heading" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Adherencia
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>
      </section>
    );
  }
  if (adherence === null) {
    return (
      <section
        className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
        aria-labelledby="adherence-heading"
      >
        <h2 id="adherence-heading" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Adherencia
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Adherencia: —</p>
      </section>
    );
  }
  return (
    <section
      className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
      aria-labelledby="adherence-heading"
    >
      <h2 id="adherence-heading" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Adherencia semanal
      </h2>
      <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {adherence.totalPercent}%
      </p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Entrenamiento: {adherence.training.percent}% ({adherence.training.completed}/
        {adherence.training.planned}) · Nutrición: {adherence.nutrition.percent}% (
        {adherence.nutrition.completed}/{adherence.nutrition.planned})
      </p>
      {computedAt && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Actualizado: {formatComputedAt(computedAt)}
        </p>
      )}
      {recomputeError && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{recomputeError}</p>
      )}
      {onRecompute && (
        <button
          type="button"
          onClick={onRecompute}
          disabled={recomputeLoading}
          className="mt-2 text-xs text-zinc-600 underline hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-50"
        >
          {recomputeLoading ? "Actualizando…" : "Actualizar adherencia"}
        </button>
      )}
    </section>
  );
}

function formatComputedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  } catch {
    return "";
  }
}

function InsightsCard({ insights: insightsData }: { insights: InsightsData | null | undefined }) {
  if (insightsData === undefined) {
    return (
      <section
        className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
        aria-labelledby="insights-heading"
      >
        <h2 id="insights-heading" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Insights
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>
      </section>
    );
  }
  if (insightsData === null) return null;
  const { insights, nextAction, coach } = insightsData;

  if (coach) {
    return (
      <section
        className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
        aria-labelledby="insights-heading"
      >
        <h2
          id="insights-heading"
          className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Insights de adherencia
        </h2>
        <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">{coach.summary}</p>
        {coach.bullets.length > 0 && (
          <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            {coach.bullets.map((b, idx) => (
              <li key={idx}>{b}</li>
            ))}
          </ul>
        )}
        <div
          className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-900/50"
          aria-label="Plan de acción"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Plan de acción
          </p>
          <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
            {coach.nextActionTitle}
          </p>
          {coach.nextActionSteps.length > 0 && (
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {coach.nextActionSteps.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ol>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
      aria-labelledby="insights-heading"
    >
      <h2
        id="insights-heading"
        className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Insights de adherencia
      </h2>
      {insights.length > 0 && (
        <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          {insights.map((i, idx) => (
            <li key={idx}>
              <span className="font-medium">{i.title}</span> — {i.detail}
            </li>
          ))}
        </ul>
      )}
      <div
        className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-900/50"
        aria-label="Siguiente acción"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Siguiente acción
        </p>
        <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{nextAction.title}</p>
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{nextAction.detail}</p>
      </div>
    </section>
  );
}

function formatGeneratedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

const PROVIDER_ERROR_RATIONALE = "Error al procesar ajustes. Se mantiene el plan actual.";

function RationalePanel({
  rationale,
  generatedAt,
}: {
  rationale: string;
  generatedAt: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const formatted = useMemo(() => formatGeneratedAt(generatedAt), [generatedAt]);
  const isProviderError = rationale === PROVIDER_ERROR_RATIONALE;
  return (
    <section className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Última actualización del plan
          {formatted ? ` — ${formatted}` : ""}
        </h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-600"
        >
          {open ? "Ocultar motivo" : "Ver motivo"}
        </button>
      </div>
      {isProviderError && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          No se pudo conectar con IA. Se mantiene el plan actual.
        </p>
      )}
      {open && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
          {rationale}
        </p>
      )}
    </section>
  );
}

function NutritionToday({
  day,
  dayIndex,
  userId,
  weekStart,
}: {
  day: NutritionDay | undefined;
  dayIndex: number;
  userId: string;
  weekStart: string;
}) {
  if (!day) {
    return (
      <div>
        <p className="mb-3 text-sm text-zinc-500">Sin menú para hoy.</p>
        <Link
          href={`/log/nutrition?dayIndex=${dayIndex}`}
          className="inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
        >
          Registrar comida igualmente
        </Link>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {day.meals.map((m, mealIndex) => (
        <li
          key={`${m.slot}-${mealIndex}`}
          className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
        >
          <div>
            {SLOT_LABEL[m.slot as keyof typeof SLOT_LABEL]}: {m.title} ({m.minutes} min)
          </div>
          <SwapMealButton
            userId={userId}
            weekStart={weekStart}
            dayIndex={day.dayIndex}
            mealIndex={mealIndex}
          />
        </li>
      ))}
    </ul>
  );
}

function SwapMealButton({
  userId,
  weekStart,
  dayIndex,
  mealIndex,
}: {
  userId: string;
  weekStart: string;
  dayIndex: number;
  mealIndex: number;
}) {
  const [open, setOpen] = useState(false);
  const [alt, setAlt] = useState<{ title: string; minutes: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSwap = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/nutrition/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, weekStart, dayIndex, mealIndex }),
      });
      const data = (await res.json()) as
        | { meal: { title: string; minutes: number } }
        | { error_code?: string; message?: string };
      if (!res.ok) {
        const err = data as { error_code?: string; message?: string; error?: string };
        setError(getErrorMessage(err, "No se pudo cambiar. Reintenta."));
        return;
      }
      setAlt((data as { meal: { title: string; minutes: number } }).meal);
      setError(null);
    } catch {
      setError("No se pudo cambiar. Reintenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setAlt(null);
          setError(null);
          void handleSwap();
        }}
        className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
      >
        Cambiar
      </button>
      {open && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-label="Alternativa de comida"
        >
          <div className="max-w-sm rounded-lg bg-white p-4 dark:bg-zinc-900">
            <h3 className="mb-2 font-medium">Alternativa</h3>
            {loading && <p className="text-sm text-zinc-500">Cargando…</p>}
            {alt && (
              <p className="text-sm">
                {alt.title} ({alt.minutes} min)
              </p>
            )}
            {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              {error && (
                <button
                  type="button"
                  onClick={() => void handleSwap()}
                  disabled={loading}
                  className="rounded-lg bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Reintentar
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
