"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDemoUserId } from "@/src/app/lib/demo";
import { ErrorBanner } from "@/src/app/components/ErrorBanner";

export default function LogNutritionPage() {
  const router = useRouter();
  const [followedPlan, setFollowedPlan] = useState(true);
  const [hunger, setHunger] = useState<"low" | "ok" | "high">("ok");
  const [mealName, setMealName] = useState("");
  const [notes, setNotes] = useState("");
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
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          followedPlan,
          hunger,
          mealName: mealName || undefined,
          notes: notes || undefined,
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
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Log comida</h1>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => setError(null)} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="mealName" className="block text-sm text-zinc-600 dark:text-zinc-400">
            Comida (opcional)
          </label>
          <input
            id="mealName"
            type="text"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="desayuno, comida, cena..."
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="followedPlan"
            type="checkbox"
            checked={followedPlan}
            onChange={(e) => setFollowedPlan(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <label htmlFor="followedPlan" className="text-sm">
            Comida realizada según plan
          </label>
        </div>
        <div>
          <span className="block text-sm text-zinc-600 dark:text-zinc-400">Hambre / saciedad</span>
          <div className="mt-1 flex gap-2">
            {(["low", "ok", "high"] as const).map((h) => (
              <label key={h} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="hunger"
                  value={h}
                  checked={hunger === h}
                  onChange={() => setHunger(h)}
                  className="h-4 w-4"
                />
                <span className="text-sm capitalize">{h}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm text-zinc-600 dark:text-zinc-400">
            Notas (opcional)
          </label>
          <input
            id="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
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
