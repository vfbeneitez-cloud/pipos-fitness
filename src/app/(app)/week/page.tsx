"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { getWeekStart, getTodayDayIndex, DAY_NAMES } from "@/src/app/lib/week";
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

export default function WeekPage() {
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const weekStart = getWeekStart(new Date());
  const todayIndex = getTodayDayIndex();

  const fetchPlan = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/weekly-plan?weekStart=${weekStart}`);
      if (!res.ok) {
        setError("Error al cargar el plan.");
        setPlan(null);
        return;
      }
      const data = (await res.json()) as Plan | null;
      setPlan(data);
    } catch {
      setError("Error de red. Reintenta.");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

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

      {plan && (
        <>
          {plan.lastRationale != null && plan.lastRationale !== "" && (
            <RationalePanel rationale={plan.lastRationale} generatedAt={plan.lastGeneratedAt} />
          )}
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
            <div className="mt-3 flex gap-2">
              <Link
                href={`/session/${todayIndex}`}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Ver sesión de hoy
              </Link>
              <Link
                href={`/log/training`}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
              >
                Log entrenamiento
              </Link>
            </div>
          </section>

          <section className="mb-8" aria-labelledby="nutrition-heading">
            <h2 id="nutrition-heading" className="mb-3 text-lg font-medium">
              Menú (hoy)
            </h2>
            <NutritionToday
              day={plan.nutritionJson?.days?.find((d) => d.dayIndex === todayIndex)}
              userId={plan.userId}
              weekStart={plan.weekStart}
            />
            <div className="mt-3">
              <Link
                href="/log/nutrition"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
              >
                Log comida
              </Link>
            </div>
          </section>
        </>
      )}
    </main>
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

function RationalePanel({
  rationale,
  generatedAt,
}: {
  rationale: string;
  generatedAt: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const formatted = useMemo(() => formatGeneratedAt(generatedAt), [generatedAt]);
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
  userId,
  weekStart,
}: {
  day: NutritionDay | undefined;
  userId: string;
  weekStart: string;
}) {
  if (!day) {
    return <p className="text-sm text-zinc-500">Sin menú para hoy.</p>;
  }
  return (
    <ul className="space-y-2">
      {day.meals.map((m) => (
        <li
          key={m.slot}
          className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
        >
          <div>
            <span className="font-medium capitalize">{m.slot}</span>: {m.title} ({m.minutes} min)
          </div>
          <SwapMealButton
            userId={userId}
            weekStart={weekStart}
            dayIndex={day.dayIndex}
            mealSlot={m.slot as "breakfast" | "lunch" | "dinner" | "snack"}
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
  mealSlot,
}: {
  userId: string;
  weekStart: string;
  dayIndex: number;
  mealSlot: "breakfast" | "lunch" | "dinner" | "snack";
}) {
  const [open, setOpen] = useState(false);
  const [alt, setAlt] = useState<{ title: string; minutes: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSwap = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nutrition/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, weekStart, dayIndex, mealSlot }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { meal: { title: string; minutes: number } };
      setAlt(data.meal);
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
            <div className="mt-4 flex justify-end gap-2">
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
