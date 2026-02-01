import Link from "next/link";

export default function ExerciseNotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <p className="mb-4 text-zinc-600 dark:text-zinc-400">Ejercicio no encontrado.</p>
      <Link
        href="/week"
        className="inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
      >
        Volver a la semana
      </Link>
    </main>
  );
}
