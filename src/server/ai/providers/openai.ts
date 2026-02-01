import * as Sentry from "@sentry/nextjs";
import { logInfo } from "@/src/server/lib/logger";
import type { AIProvider, AgentMessage, AgentResponse } from "../provider";

const OPENAI_TIMEOUT_MS = 12_000;
const CHAT_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const RATE_LIMIT_BACKOFF_MS = 2000;
const MAX_ATTEMPTS = 3;

export function buildOpenAIPayload(
  endpoint: "chat" | "responses",
  messages: AgentMessage[],
  maxTokens: number,
): Record<string, unknown> {
  if (endpoint === "chat") {
    return {
      model: "gpt-4o-mini",
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" as const },
    };
  }
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const userParts = messages.filter((m) => m.role === "user").map((m) => m.content);
  const input =
    userParts.length === 1
      ? userParts[0]!
      : userParts.map((c) => ({ role: "user" as const, content: c }));
  return {
    model: "gpt-4o-mini",
    instructions: system,
    input,
    temperature: 0.2,
    max_output_tokens: maxTokens,
    text: { format: { type: "json_object" as const } },
  };
}
const TRANSIENT_STATUSES = [500, 502, 503];

function isTransientError(err: unknown, status?: number): boolean {
  if (status !== undefined && TRANSIENT_STATUSES.includes(status)) return true;
  if (status === 429) return true;
  if (err instanceof Error) {
    if (err.name === "AbortError") return true;
    if (
      err.message.startsWith("OpenAI API error: ") &&
      (TRANSIENT_STATUSES.some((s) => err.message.includes(String(s))) ||
        err.message.includes("429"))
    )
      return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * OpenAI provider (opcional). Requiere OPENAI_API_KEY en env.
 *
 * - JSON estricto: response_format { type: "json_object" }.
 * - Temperature 0.2; max_tokens: caller pasa límite (p. ej. 4000), default 2000.
 * - Timeout 12s; 1 retry solo en 5xx y timeout (429 no reintenta).
 */
export class OpenAIProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: AgentMessage[], options?: { maxTokens?: number }): Promise<AgentResponse> {
    const maxTokens = options?.maxTokens ?? 2000;
    const payload = buildOpenAIPayload("chat", messages, maxTokens);

    const doRequest = (signal: AbortSignal) =>
      fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal,
      });

    let lastError: unknown;
    let lastStatus: number | undefined;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
      try {
        const res = await doRequest(controller.signal);
        clearTimeout(timeoutId);
        lastStatus = res.status;
        if (!res.ok) {
          if (res.status === 401) {
            Sentry.captureMessage("OpenAI unauthorized", {
              tags: { fallback_type: "provider_error" },
            });
            throw new Error("OpenAI unauthorized");
          }
          const err = new Error(`OpenAI API error: ${res.status}`);
          if (attempt < MAX_ATTEMPTS - 1 && isTransientError(err, res.status)) {
            lastError = err;
            if (res.status === 429) {
              const backoff = RATE_LIMIT_BACKOFF_MS * (attempt + 1);
              await sleep(backoff);
            }
            continue;
          }
          throw err;
        }
        const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
        logInfo("agent", "OpenAI response received");
        return { content: data.choices[0]?.message?.content ?? "" };
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
        if (err instanceof Error && err.message === "OpenAI unauthorized") throw err;
        if (
          attempt < MAX_ATTEMPTS - 1 &&
          ((err instanceof Error && err.name === "AbortError") || isTransientError(err, lastStatus))
        ) {
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }
}
