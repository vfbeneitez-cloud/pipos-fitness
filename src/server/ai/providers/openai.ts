import type { AIProvider, AgentMessage, AgentResponse } from "../provider";

/**
 * OpenAI provider (opcional). Requiere OPENAI_API_KEY en env.
 */
export class OpenAIProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: AgentMessage[]): Promise<AgentResponse> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status}`);
    }

    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    return { content: data.choices[0]?.message?.content ?? "" };
  }
}
