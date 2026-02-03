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

  // Test log
  Sentry.logger.info("User triggered test log", { log_source: "sentry_test" });

  // Test exception
  const err = new Error("[SENTRY_DEBUG] Server-side test event");
  Sentry.captureException(err);

  // Test message
  Sentry.captureMessage("Sentry debug test message", {
    level: "warning",
    tags: { test_type: "debug_endpoint" },
  });

  return NextResponse.json(
    {
      ok: true,
      message: "Test log, exception, and message sent to Sentry (check Issues and Logs)",
    },
    { headers: NO_STORE_HEADERS },
  );
}
