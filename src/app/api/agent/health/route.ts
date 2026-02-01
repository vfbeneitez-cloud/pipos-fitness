import { NextResponse } from "next/server";
import { getProvider } from "@/src/server/ai/getProvider";

/**
 * Diagnóstico: indica si OPENAI_API_KEY está definida y qué provider se usará.
 * ?ping=1 hace una llamada mínima a OpenAI para verificar conectividad.
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
    const provider = getProvider();
    const res = await provider.chat([{ role: "user", content: 'Respond "ok"' }], { maxTokens: 10 });
    return NextResponse.json({
      ...base,
      ping: "ok",
      pingContent: res.content?.slice(0, 50) ?? "",
    });
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
