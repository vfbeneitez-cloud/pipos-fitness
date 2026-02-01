import type { AIProvider, AgentMessage, AgentResponse } from "../provider";

/**
 * OpenAI provider (opcional). Requiere OPENAI_API_KEY en env.
 *
 * JSON estricto: response_format { type: "json_object" } obliga al modelo a devolver solo JSON válido.
 * Temperature baja (0.2) para respuestas más deterministas.
 * maxTokens: el caller pasa el límite (p. ej. 4000 para plan semanal); default 2000.
 */
export class OpenAIProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: AgentMessage[], options?: { maxTokens?: number }): Promise<AgentResponse> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.2,
        max_tokens: options?.maxTokens ?? 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status}`);
    }

    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    return { content: data.choices[0]?.message?.content ?? "" };
  }
}
