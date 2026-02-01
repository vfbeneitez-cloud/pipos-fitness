"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDemoUserId } from "@/src/app/lib/demo";
import { ErrorBanner } from "@/src/app/components/ErrorBanner";
import { getErrorMessage } from "@/src/app/lib/errorMessage";
import { getWeekStart, getTodayDayIndex } from "@/src/app/lib/week";

const DIFFICULTY_OPTIONS: { value: "easy" | "ok" | "hard"; label: string; emoji: string }[] = [
  { value: "easy", label: "Fácil", emoji: "😌" },
  { value: "ok", label: "Normal", emoji: "🙂" },
  { value: "hard", label: "Duro", emoji: "😣" },
];

type TrainingSession = {
  dayIndex: number;
  name: string;
};
type Plan = {
  id: string;
  trainingJson?: { sessions?: TrainingSession[] };
};

export default function LogTrainingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [done, setDone] = useState<boolean | null>(null);
  const [difficulty, setDifficulty] = useState<"easy" | "ok" | "hard">("ok");
  const [pain, setPain] = useState(false);
  const [painNotes, setPainNotes] = useState("");
  const [optionalNotes, setOptionalNotes] = useState("");
  const [optionalNotesVisible, setOptionalNotesVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [dayIndex, setDayIndex] = useState<number>(getTodayDayIndex());

  const session = plan?.trainingJson?.sessions?.find((s) => s.dayIndex === dayIndex);
  const hasNoSession = plan !== undefined && (plan === null || !session);

  const canSubmit = done === false || (done === true && difficulty != null);

  const weekStart = getWeekStart(new Date());
  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/weekly-plan?weekStart=${weekStart}`);
      const data = (await res.json()) as Plan | null;
      if (res.ok) setPlan(data);
      else setPlan(null);
    } catch {
      setPlan(null);
    }
  }, [weekStart]);

  useEffect(() => {
    const idx = searchParams.get("dayIndex");
    if (idx !== null) {
      const n = parseInt(idx, 10);
      if (!Number.isNaN(n) && n >= 0 && n <= 6) setDayIndex(n);
    }
  }, [searchParams]);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  // MVP: painNotes combina detalle de dolor + notas generales (deuda técnica: valorar separar en sprint futuro)
  const buildPainNotesPayload = (): string | undefined => {
    const parts: string[] = [];
    if (pain && painNotes.trim()) parts.push(painNotes.trim());
    if (optionalNotes.trim()) parts.push(optionalNotes.trim());
    return parts.length ? parts.join("\n") : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = getDemoUserId();
    if (!userId) {
      setError("Sesión no encontrada.");
      return;
    }
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const completed = done === true;
      const sessionName = session?.name ?? "Entrenamiento libre";
      const payload: Record<string, unknown> = {
        userId,
        completed,
        difficulty: completed ? difficulty : undefined,
        pain: completed ? pain : false,
        painNotes: completed ? buildPainNotesPayload() : undefined,
        sessionName,
        dayIndex,
      };
      if (plan?.id) payload.planId = plan.id;
      const res = await fetch("/api/training/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json()) as {
          error?: string;
          error_code?: string;
          message?: string;
        };
        setError(getErrorMessage(data, "Error al guardar."));
        return;
      }
      router.push("/week");
    } catch {
      setError("Error de red. Reintenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <nav className="mb-4" aria-label="Breadcrumb">
        <Link href="/week" className="text-sm text-zinc-500 underline">
          ← Semana
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Registrar entrenamiento
      </h1>

      {hasNoSession && (
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Hoy no había sesión programada. Lo registraré como entrenamiento libre.
        </p>
      )}

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => setError(null)} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset>
          <legend className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            ¿Has entrenado hoy?
          </legend>
          <div className="mt-2 flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="done"
                checked={done === true}
                onChange={() => setDone(true)}
                className="h-4 w-4"
              />
              <span>Sí</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="done"
                checked={done === false}
                onChange={() => setDone(false)}
                className="h-4 w-4"
              />
              <span>No</span>
            </label>
          </div>
        </fieldset>

        {done === true && (
          <>
            <fieldset>
              <legend className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                ¿Cómo se sintió el entrenamiento?
              </legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-100 dark:border-zinc-600 dark:has-[:checked]:border-zinc-100 dark:has-[:checked]:bg-zinc-800"
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      value={opt.value}
                      checked={difficulty === opt.value}
                      onChange={() => setDifficulty(opt.value)}
                      className="sr-only"
                    />
                    <span aria-hidden>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                ¿Sentiste dolor o molestias?
              </legend>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pain"
                    checked={!pain}
                    onChange={() => setPain(false)}
                    className="h-4 w-4"
                  />
                  <span>No</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pain"
                    checked={pain}
                    onChange={() => setPain(true)}
                    className="h-4 w-4"
                  />
                  <span>Sí</span>
                </label>
              </div>
              {pain && (
                <div className="mt-3">
                  <textarea
                    value={painNotes}
                    onChange={(e) => setPainNotes(e.target.value)}
                    placeholder="¿Dónde o qué tipo de molestia?"
                    rows={2}
                    className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                  />
                </div>
              )}
            </fieldset>

            <div>
              {!optionalNotesVisible ? (
                <button
                  type="button"
                  onClick={() => setOptionalNotesVisible(true)}
                  className="text-sm text-zinc-600 underline dark:text-zinc-400"
                >
                  Añadir nota (opcional)
                </button>
              ) : (
                <textarea
                  value={optionalNotes}
                  onChange={(e) => setOptionalNotes(e.target.value)}
                  placeholder="Energía, tiempo, sensaciones…"
                  rows={2}
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                />
              )}
            </div>
          </>
        )}

        {done !== null && (
          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {loading ? "Guardando…" : "Guardar entrenamiento"}
            </button>
          </div>
        )}
      </form>
    </main>
  );
}
