"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getWeekStart } from "@/src/app/lib/week";
import { ErrorBanner } from "@/src/app/components/ErrorBanner";
import { getErrorMessage } from "@/src/app/lib/errorMessage";

const ENVIRONMENTS = [
  { value: "GYM", label: "Gimnasio" },
  { value: "HOME", label: "Casa" },
  { value: "CALISTHENICS", label: "Calistenia" },
  { value: "POOL", label: "Piscina" },
  { value: "MIXED", label: "Mixto" },
  { value: "ESTIRAMIENTOS", label: "Estiramientos" },
] as const;

const LEVELS = [
  { value: "BEGINNER", label: "Principiante" },
  { value: "INTERMEDIATE", label: "Intermedio" },
  { value: "ADVANCED", label: "Avanzado" },
] as const;

const COOKING_TIMES = [
  { value: "MIN_10", label: "10 min" },
  { value: "MIN_20", label: "20 min" },
  { value: "MIN_40", label: "40 min" },
  { value: "FLEXIBLE", label: "Flexible" },
] as const;

type UserProfile = {
  id: string;
  userId: string;
  goal: string | null;
  level: string;
  daysPerWeek: number;
  sessionMinutes: number;
  environment: string;
  equipmentNotes: string | null;
  injuryNotes: string | null;
  dietaryStyle: string | null;
  allergies: string | null;
  dislikes: string | null;
  cookingTime: string;
  mealsPerDay: number;
};

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700" />
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null | "loading">("loading");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("BEGINNER");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [environment, setEnvironment] = useState("GYM");
  const [equipmentNotes, setEquipmentNotes] = useState("");
  const [injuryNotes, setInjuryNotes] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [cookingTime, setCookingTime] = useState("MIN_20");
  const [dietaryStyle, setDietaryStyle] = useState("");
  const [allergies, setAllergies] = useState("");
  const [dislikes, setDislikes] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = (await res.json()) as {
          profile?: UserProfile | null;
          error?: string;
          error_code?: string;
          message?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(getErrorMessage(data, "No se pudo cargar el perfil."));
          setProfile(null);
          return;
        }
        setProfile(data.profile ?? null);
        if (data.profile) {
          setGoal(data.profile.goal ?? "");
          setLevel(data.profile.level);
          setDaysPerWeek(data.profile.daysPerWeek);
          setSessionMinutes(data.profile.sessionMinutes);
          setEnvironment(data.profile.environment);
          setEquipmentNotes(data.profile.equipmentNotes ?? "");
          setInjuryNotes(data.profile.injuryNotes ?? "");
          setMealsPerDay(data.profile.mealsPerDay);
          setCookingTime(data.profile.cookingTime);
          setDietaryStyle(data.profile.dietaryStyle ?? "");
          setAllergies(data.profile.allergies ?? "");
          setDislikes(data.profile.dislikes ?? "");
        }
      } catch {
        if (!cancelled) {
          setError("Error de red. Reintenta.");
          setProfile(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  const handleSave = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);
    setSaveLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goal || undefined,
          level,
          daysPerWeek,
          sessionMinutes,
          environment,
          equipmentNotes: equipmentNotes || undefined,
          injuryNotes: injuryNotes || undefined,
          mealsPerDay,
          cookingTime,
          dietaryStyle: dietaryStyle || undefined,
          allergies: allergies || undefined,
          dislikes: dislikes || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        error_code?: string;
        message?: string;
        profile?: UserProfile;
      };
      if (!res.ok) {
        setError(getErrorMessage(data, "Error al guardar. Reintenta."));
        return;
      }
      setSuccessMessage("Perfil actualizado.");
      if (data.profile) setProfile(data.profile);
    } catch {
      setError("Error de red. Reintenta.");
    } finally {
      setSaveLoading(false);
    }
  }, [
    goal,
    level,
    daysPerWeek,
    sessionMinutes,
    environment,
    equipmentNotes,
    injuryNotes,
    mealsPerDay,
    cookingTime,
    dietaryStyle,
    allergies,
    dislikes,
  ]);

  const handleRegenConfirm = useCallback(async () => {
    setError(null);
    setRegenLoading(true);
    try {
      const weekStart = getWeekStart(new Date());
      const res = await fetch("/api/agent/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });
      const data = (await res.json()) as { error?: string; error_code?: string; message?: string };
      if (!res.ok) {
        setError(getErrorMessage(data, "Error al regenerar plan."));
        setRegenModalOpen(false);
        return;
      }
      setRegenModalOpen(false);
      router.push("/week");
    } catch {
      setError("Error de red. Reintenta.");
      setRegenModalOpen(false);
    } finally {
      setRegenLoading(false);
    }
  }, [router]);

  if (profile === "loading") {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 pb-20">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Perfil</h1>
        <LoadingSkeleton />
      </main>
    );
  }

  if (profile === null && error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 pb-20">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Perfil</h1>
        <ErrorBanner
          message={error}
          onRetry={() => {
            setError(null);
            setProfile("loading");
            setLoadKey((k) => k + 1);
          }}
        />
      </main>
    );
  }

  if (profile === null) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 pb-20">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Perfil</h1>
        <p className="mb-4 text-zinc-600 dark:text-zinc-400">
          Aún no tienes perfil. Configura tus preferencias para generar tu plan.
        </p>
        <Link
          href="/onboarding"
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Configurar preferencias
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 pb-20">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Perfil</h1>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => setError(null)} />
        </div>
      )}
      {successMessage && (
        <p
          className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/50 dark:text-green-200"
          role="status"
        >
          {successMessage}
        </p>
      )}

      <section aria-labelledby="training-title" className="mb-8">
        <h2 id="training-title" className="mb-4 text-lg font-medium">
          Entrenamiento
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="goal" className="block text-sm text-zinc-600 dark:text-zinc-400">
              Objetivo (opcional)
            </label>
            <input
              id="goal"
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="ej. mejorar salud, ganar músculo"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label htmlFor="level" className="block text-sm text-zinc-600 dark:text-zinc-400">
              Nivel
            </label>
            <select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="daysPerWeek" className="block text-sm text-zinc-600 dark:text-zinc-400">
              Días por semana
            </label>
            <input
              id="daysPerWeek"
              type="number"
              min={1}
              max={7}
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label
              htmlFor="sessionMinutes"
              className="block text-sm text-zinc-600 dark:text-zinc-400"
            >
              Minutos por sesión
            </label>
            <input
              id="sessionMinutes"
              type="number"
              min={15}
              max={180}
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(Number(e.target.value))}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label htmlFor="environment" className="block text-sm text-zinc-600 dark:text-zinc-400">
              Entorno
            </label>
            <select
              id="environment"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            >
              {ENVIRONMENTS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="equipmentNotes"
              className="block text-sm text-zinc-600 dark:text-zinc-400"
            >
              Notas equipo (opcional)
            </label>
            <input
              id="equipmentNotes"
              type="text"
              value={equipmentNotes}
              onChange={(e) => setEquipmentNotes(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label htmlFor="injuryNotes" className="block text-sm text-zinc-600 dark:text-zinc-400">
              Notas lesiones (opcional)
            </label>
            <input
              id="injuryNotes"
              type="text"
              value={injuryNotes}
              onChange={(e) => setInjuryNotes(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="nutrition-title" className="mb-8">
        <h2 id="nutrition-title" className="mb-4 text-lg font-medium">
          Nutrición
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="mealsPerDay" className="block text-sm text-zinc-600 dark:text-zinc-400">
              Comidas al día
            </label>
            <input
              id="mealsPerDay"
              type="number"
              min={2}
              max={4}
              value={mealsPerDay}
              onChange={(e) => setMealsPerDay(Number(e.target.value))}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label htmlFor="cookingTime" className="block text-sm text-zinc-600 dark:text-zinc-400">
              Tiempo para cocinar
            </label>
            <select
              id="cookingTime"
              value={cookingTime}
              onChange={(e) => setCookingTime(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            >
              {COOKING_TIMES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="dietaryStyle"
              className="block text-sm text-zinc-600 dark:text-zinc-400"
            >
              Estilo (opcional)
            </label>
            <input
              id="dietaryStyle"
              type="text"
              value={dietaryStyle}
              onChange={(e) => setDietaryStyle(e.target.value)}
              placeholder="omnivoro, vegetariano..."
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label htmlFor="allergies" className="block text-sm text-zinc-600 dark:text-zinc-400">
              Alergias (opcional)
            </label>
            <input
              id="allergies"
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="separadas por coma"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label htmlFor="dislikes" className="block text-sm text-zinc-600 dark:text-zinc-400">
              No me gusta (opcional)
            </label>
            <input
              id="dislikes"
              type="text"
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
              placeholder="separados por coma"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveLoading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {saveLoading ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => setRegenModalOpen(true)}
          className="rounded-lg border border-zinc-300 px-4 py-2 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          Regenerar plan de esta semana
        </button>
      </div>

      {regenModalOpen && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="regen-modal-title"
        >
          <div className="max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
            <h2 id="regen-modal-title" className="mb-3 text-lg font-medium">
              Regenerar plan
            </h2>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Se regenerará el plan de esta semana. Tus registros no se borran.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRegenModalOpen(false)}
                disabled={regenLoading}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRegenConfirm}
                disabled={regenLoading}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {regenLoading ? "Regenerando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
