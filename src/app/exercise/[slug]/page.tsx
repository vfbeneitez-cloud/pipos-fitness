import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/src/server/db/prisma";

const ENV_LABELS: Record<string, string> = {
  GYM: "Gimnasio",
  HOME: "Casa",
  CALISTHENICS: "Calistenia",
  POOL: "Piscina",
  MIXED: "Mixto",
};

type Props = {
  params: Promise<{ slug: string }>;
};

// MVP: cache deduplica fetch entre generateMetadata y page (misma request)
const getExerciseBySlug = cache(async (slug: string) => {
  return prisma.exercise.findUnique({
    where: { slug },
    include: {
      media: {
        select: { id: true, type: true, url: true, thumbnailUrl: true },
        orderBy: { createdAt: "asc" as const },
      },
    },
  });
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const exercise = await getExerciseBySlug(slug);
  if (!exercise) return {};
  return {
    title: `${exercise.name} | PipOS Fitness`,
    description:
      exercise.description ?? "Guía de ejecución, puntos clave y variantes del ejercicio.",
    robots: "index, follow",
  };
}

export default async function ExercisePage({ params }: Props) {
  const { slug } = await params;
  const exercise = await getExerciseBySlug(slug);

  if (!exercise) {
    notFound();
  }

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
        {ENV_LABELS[exercise.environment] ?? exercise.environment}
        {exercise.primaryMuscle && ` · ${exercise.primaryMuscle}`}
      </p>

      {media ? (
        <div className="mb-6 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          {media.type === "video" ? (
            <video
              src={media.url}
              controls
              className="w-full"
              poster={media.thumbnailUrl ?? undefined}
              aria-label={`Vídeo de ${exercise.name}`}
            >
              No se pudo reproducir el vídeo.
            </video>
          ) : (
            // MVP: unoptimized evita config de dominios externos para thumbnails
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
      ) : (
        <div className="mb-6 flex h-40 items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-800">
          Sin vídeo o imagen disponible.
        </div>
      )}

      <section className="mb-6" aria-labelledby="desc-heading">
        <h2 id="desc-heading" className="mb-2 font-medium">
          Descripción
        </h2>
        <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
          {exercise.description ??
            `Ejercicio para trabajar principalmente ${exercise.primaryMuscle ?? "varios grupos musculares"} en ${ENV_LABELS[exercise.environment] ?? exercise.environment}.`}
        </p>
      </section>

      {exercise.cues && (
        <section className="mb-6" aria-labelledby="cues-heading">
          <h2 id="cues-heading" className="mb-2 font-medium">
            Puntos clave
          </h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
            {exercise.cues}
          </p>
        </section>
      )}

      {exercise.commonMistakes && (
        <section className="mb-6" aria-labelledby="mistakes-heading">
          <h2 id="mistakes-heading" className="mb-2 font-medium">
            Errores comunes y seguridad
          </h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
            {exercise.commonMistakes}
          </p>
        </section>
      )}

      {exercise.regressions && (
        <section className="mb-6" aria-labelledby="easier-heading">
          <h2 id="easier-heading" className="mb-2 font-medium">
            Versión más fácil
          </h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
            {exercise.regressions}
          </p>
        </section>
      )}

      {exercise.progressions && (
        <section className="mb-6" aria-labelledby="harder-heading">
          <h2 id="harder-heading" className="mb-2 font-medium">
            Versión más difícil
          </h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
            {exercise.progressions}
          </p>
        </section>
      )}

      {/* B4: ejercicio es desvío temporal; CTA siempre vuelve a semana, no a sesión */}
      <Link
        href="/week"
        className="inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
      >
        ← Volver a la semana
      </Link>
    </main>
  );
}
