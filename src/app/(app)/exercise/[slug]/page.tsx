"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ErrorBanner } from "@/src/app/components/ErrorBanner";
import { LoadingSkeleton } from "@/src/app/components/LoadingSkeleton";

type Exercise = {
  id: string;
  slug: string;
  name: string;
  environment: string;
  primaryMuscle: string | null;
  description: string | null;
  cues: string | null;
  commonMistakes: string | null;
  regressions: string | null;
  progressions: string | null;
  media: Array<{ id: string; type: string; url: string; thumbnailUrl: string | null }>;
};

export default function ExercisePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [exercise, setExercise] = useState<Exercise | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/exercises");
        if (!res.ok) {
          setError("Error al cargar ejercicios.");
          setExercise(null);
          return;
        }
        const list = (await res.json()) as Exercise[];
        const found = list.find((e) => e.slug === slug);
        if (!cancelled) setExercise(found ?? null);
      } catch {
        if (!cancelled) {
          setError("Error de red. Reintenta.");
          setExercise(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading && exercise === undefined) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <LoadingSkeleton />
      </main>
    );
  }

  if (exercise === null || !exercise) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-zinc-500">Ejercicio no encontrado.</p>
        <Link href="/week" className="mt-2 inline-block text-sm underline">
          Volver a la semana
        </Link>
      </main>
    );
  }

  const envLabels: Record<string, string> = {
    GYM: "Gimnasio",
    HOME: "Casa",
    CALISTHENICS: "Calistenia",
    POOL: "Piscina",
    MIXED: "Mixto",
  };
  const media = exercise.media?.[0];

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <nav className="mb-4" aria-label="Breadcrumb">
        <Link href="/week" className="text-sm text-zinc-500 underline">
          ← Semana
        </Link>
      </nav>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {exercise.name}
      </h1>
      <p className="mb-4 text-sm text-zinc-500">
        {envLabels[exercise.environment] ?? exercise.environment}
        {exercise.primaryMuscle && ` · ${exercise.primaryMuscle}`}
      </p>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {media && (
        <div className="mb-6 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          {media.type === "video" ? (
            <video
              src={media.url}
              controls
              className="w-full"
              poster={media.thumbnailUrl ?? undefined}
              aria-label={`Vídeo de ${exercise.name}`}
            >
              Tu navegador no soporta vídeo.
            </video>
          ) : (
            <Image
              src={media.url}
              alt={`Ilustración de ${exercise.name}`}
              width={800}
              height={600}
              className="w-full object-cover"
              unoptimized
            />
          )}
        </div>
      )}
      {(!media || !exercise.media?.length) && (
        <div className="mb-6 flex h-40 items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-800">
          Sin media (placeholder)
        </div>
      )}

      {exercise.description && (
        <section className="mb-6" aria-labelledby="desc-heading">
          <h2 id="desc-heading" className="mb-2 font-medium">
            Descripción
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {exercise.description}
          </p>
        </section>
      )}

      {exercise.cues && (
        <section className="mb-6" aria-labelledby="cues-heading">
          <h2 id="cues-heading" className="mb-2 font-medium">
            Puntos clave
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {exercise.cues}
          </p>
        </section>
      )}

      {exercise.commonMistakes && (
        <section className="mb-6" aria-labelledby="mistakes-heading">
          <h2 id="mistakes-heading" className="mb-2 font-medium">
            Errores comunes y seguridad
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {exercise.commonMistakes}
          </p>
        </section>
      )}

      {(exercise.regressions || exercise.progressions) && (
        <section className="mb-6" aria-labelledby="variants-heading">
          <h2 id="variants-heading" className="mb-2 font-medium">
            Regresiones / Progresiones
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {[exercise.regressions, exercise.progressions].filter(Boolean).join("\n\n")}
          </p>
        </section>
      )}

      <Link
        href="/week"
        className="inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
      >
        Volver a la sesión
      </Link>
    </main>
  );
}

