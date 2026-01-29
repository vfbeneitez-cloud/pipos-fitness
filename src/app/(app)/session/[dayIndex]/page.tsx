"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getWeekStart } from "@/src/app/lib/week";
import { DAY_NAMES } from "@/src/app/lib/week";
import { ErrorBanner } from "@/src/app/components/ErrorBanner";
import { LoadingSkeleton } from "@/src/app/components/LoadingSkeleton";

type TrainingSession = {
  dayIndex: number;
  name: string;
  exercises: Array<{ slug: string; name: string; sets: number; reps: string; restSec: number }>;
};

type Plan = {
  trainingJson: { sessions: TrainingSession[] };
};

export default function SessionPage() {
  const params = useParams();
  const dayIndex = Number(params.dayIndex);
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const weekStart = getWeekStart(new Date());

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

  if (Number.isNaN(dayIndex) || dayIndex < 0 || dayIndex > 6) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-zinc-500">Día no válido.</p>
        <Link href="/week" className="mt-2 inline-block text-sm underline">
          Volver a la semana
        </Link>
      </main>
    );
  }

  if (plan === undefined && loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Sesión</h1>
        <LoadingSkeleton />
      </main>
    );
  }

  const session = plan?.trainingJson?.sessions?.find((s) => s.dayIndex === dayIndex);

  if (plan && !session) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">{DAY_NAMES[dayIndex]}</h1>
        <p className="mb-4 text-zinc-600 dark:text-zinc-400">Día libre o recuperación activa.</p>
        <Link
          href="/week"
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Ver semana
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <nav className="mb-4" aria-label="Breadcrumb">
        <Link href="/week" className="text-sm text-zinc-500 underline">
          ← Semana
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {DAY_NAMES[dayIndex]} — {session?.name}
      </h1>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={fetchPlan} />
        </div>
      )}

      {session && (
        <>
          <ul className="mb-8 space-y-3">
            {session.exercises.map((ex) => (
              <li key={ex.slug}>
                <Link
                  href={`/exercise/${ex.slug}`}
                  className="block rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
                >
                  <span className="font-medium">{ex.name}</span>
                  <span className="ml-2 text-sm text-zinc-500">
                    {ex.sets} × {ex.reps} — {ex.restSec}s descanso
                  </span>
                  <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">
                    Ver guía →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/log/training"
            className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Marcar sesión como hecha
          </Link>
        </>
      )}
    </main>
  );
}
