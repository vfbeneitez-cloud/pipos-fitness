import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

/**
 * Solo activo cuando SENTRY_DEBUG=true en entornos no producción. Sirve para
 * verificar que Sentry recibe eventos en el server sin provocar errores en prod.
 * En producción siempre 404.
 */
export async function GET() {
  const isProduction =
    process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

  if (isProduction) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (process.env.SENTRY_DEBUG !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const err = new Error("[SENTRY_DEBUG] Server-side test event");
  Sentry.captureException(err);

  return NextResponse.json(
    {
      ok: true,
      message: "Test exception sent to Sentry (check Issues)",
    },
    { headers: NO_STORE_HEADERS },
  );
}
