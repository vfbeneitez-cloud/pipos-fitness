import { NextResponse } from "next/server";

/**
 * Diagnóstico: indica si OPENAI_API_KEY está definida y qué provider se usará.
 * No expone el valor de la clave.
 */
export async function GET() {
  const openaiConfigured = Boolean(
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0,
  );
  return NextResponse.json({
    openaiConfigured,
    provider: openaiConfigured ? "openai" : "mock",
  });
}
