"use client";

import { useState, useCallback } from "react";
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

type Step = "welcome" | "training" | "nutrition" | "summary";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("BEGINNER");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [environment, setEnvironment] = useState("GYM");
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [cookingTime, setCookingTime] = useState("MIN_20");
  const [dietaryStyle, setDietaryStyle] = useState("");
  const [allergies, setAllergies] = useState("");
  const [dislikes, setDislikes] = useState("");

  const handleSetupAndPlan = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goal || undefined,
          level,
          daysPerWeek,
          sessionMinutes,
          environment,
          mealsPerDay,
          cookingTime,
          dietaryStyle: dietaryStyle || undefined,
          allergies: allergies || undefined,
          dislikes: dislikes || undefined,
        }),
      });
      if (!profileRes.ok) {
        const err = (await profileRes.json()) as {
          error?: string;
          error_code?: string;
          message?: string;
        };
        setError(getErrorMessage(err, "Error al guardar. Reintenta."));
        return;
      }

      const weekStart = getWeekStart(new Date(Date.now()));
      const planRes = await fetch("/api/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          environment,
          daysPerWeek,
          sessionMinutes,
        }),
      });
      if (!planRes.ok) {
        const err = (await planRes.json()) as {
          error?: string;
          error_code?: string;
          message?: string;
        };
        setError(getErrorMessage(err, "Error al crear plan."));
        return;
      }
      router.push("/week");
    } catch {
      setError("Error de red. Reintenta.");
    } finally {
      setLoading(false);
    }
  }, [
    goal,
    level,
    daysPerWeek,
    sessionMinutes,
    environment,
    mealsPerDay,
    cookingTime,
    dietaryStyle,
    allergies,
    dislikes,
    router,
  ]);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Pipos Fitness
      </h1>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => setError(null)} />
        </div>
      )}

      {step === "welcome" && (
        <section aria-labelledby="welcome-title">
          <h2 id="welcome-title" className="mb-4 text-lg font-medium">
            Bienvenido
          </h2>
          <p className="mb-6 text-zinc-600 dark:text-zinc-400">
            Planes semanales de entrenamiento y nutrición, con guía visual de ejercicios.
          </p>
          <p className="mb-6 text-xs text-zinc-500 dark:text-zinc-500">
            Versión beta. Esta app no sustituye el consejo médico o nutricional. Si tienes dudas,
            consulta a un profesional.
          </p>
          <button
            type="button"
            onClick={() => setStep("training")}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Empezar
          </button>
        </section>
      )}

      {step === "training" && (
        <section aria-labelledby="training-title">
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
              <label
                htmlFor="daysPerWeek"
                className="block text-sm text-zinc-600 dark:text-zinc-400"
              >
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
              <label
                htmlFor="environment"
                className="block text-sm text-zinc-600 dark:text-zinc-400"
              >
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
          </div>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setStep("welcome")}
              className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={() => setStep("nutrition")}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Siguiente
            </button>
          </div>
        </section>
      )}

      {step === "nutrition" && (
        <section aria-labelledby="nutrition-title">
          <h2 id="nutrition-title" className="mb-4 text-lg font-medium">
            Nutrición
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="mealsPerDay"
                className="block text-sm text-zinc-600 dark:text-zinc-400"
              >
                Comidas al día
              </label>
              <input
                id="mealsPerDay"
                type="number"
                min={2}
                max={5}
                value={mealsPerDay}
                onChange={(e) => setMealsPerDay(Number(e.target.value))}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label
                htmlFor="cookingTime"
                className="block text-sm text-zinc-600 dark:text-zinc-400"
              >
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
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setStep("training")}
              className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={() => setStep("summary")}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Siguiente
            </button>
          </div>
        </section>
      )}

      {step === "summary" && (
        <section aria-labelledby="summary-title">
          <h2 id="summary-title" className="mb-4 text-lg font-medium">
            Resumen
          </h2>
          <ul className="mb-6 list-inside list-disc text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              Entreno: {LEVELS.find((l) => l.value === level)?.label}, {daysPerWeek} días/sem,{" "}
              {sessionMinutes} min
            </li>
            <li>Entorno: {ENVIRONMENTS.find((e) => e.value === environment)?.label}</li>
            <li>
              Nutrición: {mealsPerDay} comidas,{" "}
              {COOKING_TIMES.find((c) => c.value === cookingTime)?.label}
            </li>
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("nutrition")}
              className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={handleSetupAndPlan}
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {loading ? "Creando plan…" : "Crear mi primera semana"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
