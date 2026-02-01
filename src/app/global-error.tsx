"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-white font-sans antialiased dark:bg-zinc-950">
        <main className="mx-auto max-w-lg px-4 py-16">
          <h1 className="mb-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Ha ocurrido un problema.
          </h1>
          <p className="mb-6 text-zinc-600 dark:text-zinc-400">
            Reintenta. Si sigue pasando, vuelve a la semana.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Reintentar
            </button>
            <a
              href="/week"
              className="inline-block rounded-lg border border-zinc-300 px-4 py-2 text-center text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            >
              Volver a la semana
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
