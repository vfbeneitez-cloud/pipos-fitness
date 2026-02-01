"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDemoUserId } from "@/src/app/lib/demo";
import { ErrorBanner } from "@/src/app/components/ErrorBanner";
import { getErrorMessage } from "@/src/app/lib/errorMessage";

const HUNGER_OPTIONS: { value: "low" | "ok" | "high"; label: string }[] = [
  { value: "low", label: "Poca" },
  { value: "ok", label: "Normal" },
  { value: "high", label: "Mucha" },
];

export default function LogNutritionPage() {
  const router = useRouter();
  const [followedMenu, setFollowedMenu] = useState<boolean | null>(null);
  const [hunger, setHunger] = useState<"low" | "ok" | "high">("ok");
  const [notes, setNotes] = useState("");
  const [notesVisible, setNotesVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    followedMenu !== null && (followedMenu === false || (followedMenu === true && hunger != null));

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
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          followedPlan: followedMenu,
          hunger: followedMenu ? hunger : undefined,
          notes: notes.trim() || undefined,
        }),
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
        Registrar comida
      </h1>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => setError(null)} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset>
          <legend className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            ¿Has seguido el menú de hoy?
          </legend>
          <div className="mt-2 flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="followedMenu"
                checked={followedMenu === true}
                onChange={() => setFollowedMenu(true)}
                className="h-4 w-4"
              />
              <span>Sí</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="followedMenu"
                checked={followedMenu === false}
                onChange={() => setFollowedMenu(false)}
                className="h-4 w-4"
              />
              <span>No</span>
            </label>
          </div>
        </fieldset>

        {followedMenu !== null && (
          <>
            <fieldset>
              <legend className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Sensación de hambre
              </legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {HUNGER_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-100 dark:border-zinc-600 dark:has-[:checked]:border-zinc-100 dark:has-[:checked]:bg-zinc-800"
                  >
                    <input
                      type="radio"
                      name="hunger"
                      value={opt.value}
                      checked={hunger === opt.value}
                      onChange={() => setHunger(opt.value)}
                      className="sr-only"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              {!notesVisible ? (
                <button
                  type="button"
                  onClick={() => setNotesVisible(true)}
                  className="text-sm text-zinc-600 underline dark:text-zinc-400"
                >
                  Añadir nota (opcional)
                </button>
              ) : (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Energía, saciedad, antojos…"
                  rows={2}
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                />
              )}
            </div>
          </>
        )}

        {followedMenu !== null && (
          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {loading ? "Guardando…" : "Guardar comida"}
            </button>
          </div>
        )}
      </form>
    </main>
  );
}
