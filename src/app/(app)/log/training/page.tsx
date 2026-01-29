"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDemoUserId } from "@/src/app/lib/demo";
import { ErrorBanner } from "@/src/app/components/ErrorBanner";

export default function LogTrainingPage() {
  const router = useRouter();
  const [completed, setCompleted] = useState(true);
  const [difficulty, setDifficulty] = useState<"easy" | "ok" | "hard">("ok");
  const [pain, setPain] = useState(false);
  const [painNotes, setPainNotes] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = getDemoUserId();
    if (!userId) {
      setError("Sesión no encontrada.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/training/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          completed,
          difficulty,
          pain,
          painNotes: painNotes || undefined,
          sessionName: sessionName || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Error al guardar.");
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
        Log entrenamiento
      </h1>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => setError(null)} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sessionName" className="block text-sm text-zinc-600 dark:text-zinc-400">
            Nombre sesión (opcional)
          </label>
          <input
            id="sessionName"
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="completed"
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <label htmlFor="completed" className="text-sm">
            Sesión hecha
          </label>
        </div>
        <div>
          <span className="block text-sm text-zinc-600 dark:text-zinc-400">Dificultad</span>
          <div className="mt-1 flex gap-2">
            {(["easy", "ok", "hard"] as const).map((d) => (
              <label key={d} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="difficulty"
                  value={d}
                  checked={difficulty === d}
                  onChange={() => setDifficulty(d)}
                  className="h-4 w-4"
                />
                <span className="text-sm capitalize">{d}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="pain"
            type="checkbox"
            checked={pain}
            onChange={(e) => setPain(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <label htmlFor="pain" className="text-sm">
            Dolor o molestia
          </label>
        </div>
        {pain && (
          <div>
            <label htmlFor="painNotes" className="block text-sm text-zinc-600 dark:text-zinc-400">
              Notas (zona, etc.)
            </label>
            <input
              id="painNotes"
              type="text"
              value={painNotes}
              onChange={(e) => setPainNotes(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
        )}
        <div className="flex gap-2 pt-4">
          <Link
            href="/week"
            className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </main>
  );
}
