import { NextResponse } from "next/server";

/**
 * Diagnóstico: indica que el provider usado es mock (sin API externa).
 */
export async function GET() {
  return NextResponse.json({
    openaiConfigured: false,
    provider: "mock",
  });
}
