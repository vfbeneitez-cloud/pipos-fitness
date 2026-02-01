import { NextResponse } from "next/server";

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

  const apiKey = process.env.OPENAI_API_KEY!.trim();
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Say ok" }],
        max_tokens: 5,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          ...base,
          ping: "error",
          pingError: `OpenAI API error: ${res.status}`,
          pingDetail: text.slice(0, 200),
        },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({
      ...base,
      ping: "ok",
      pingContent: content.slice(0, 50),
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
