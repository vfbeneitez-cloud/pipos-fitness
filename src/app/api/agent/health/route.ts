import { NextResponse } from "next/server";
import { OpenAIProvider } from "@/src/server/ai/providers/openai";

/**
 * Diagnóstico: indica si OPENAI_API_KEY está definida y qué provider se usará.
 * ?ping=1 hace una llamada mínima a OpenAI para verificar conectividad (sin json_object).
 */
export async function GET(request: Request) {
  const openaiConfigured = Boolean(
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0,
  );
  const u = new URL(request.url);
  const ping = u.searchParams.get("ping") === "1";

  const base = {
    openaiConfigured,
    provider: openaiConfigured ? "openai" : "mock",
  };

  if (!ping || !openaiConfigured) {
    return NextResponse.json(base);
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY!.trim();
    const provider = new OpenAIProvider(apiKey);
    const r = await provider.chat(
      [
        {
          role: "system",
          content: 'Return ONLY valid JSON: {"ok":true}.',
        },
        { role: "user", content: "ping" },
      ],
      { maxTokens: 20 },
    );
    const parsed = JSON.parse(r.content) as { ok?: boolean };
    if (!parsed?.ok) {
      return NextResponse.json(
        { ...base, ping: "error", pingError: "OpenAI returned unexpected JSON" },
        { status: 502 },
      );
    }
    return NextResponse.json({ ...base, ping: "ok" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ...base,
        ping: "error",
        pingError: msg,
      },
      { status: 502 },
    );
  }
}
