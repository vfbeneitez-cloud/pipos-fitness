/**
 * Cliente OpenAI limpio y simple
 * - JSON mode siempre activado
 * - Timeout configurable
 * - Retry automático en errores transitorios
 */

import * as Sentry from "@sentry/nextjs";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 8000; // Vercel Hobby = 10s, dejamos margen
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class OpenAIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.apiKey = apiKey;
  }

  /**
   * Envía un chat completion request a OpenAI
   * Retorna el contenido parseado como JSON
   */
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const {
      model = "gpt-4o-mini",
      temperature = 0.3,
      maxTokens = 4000,
      timeoutMs = DEFAULT_TIMEOUT_MS,
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(OPENAI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");

          // Error permanente (401, 400)
          if (response.status === 401) {
            Sentry.captureMessage("OpenAI API key invalid", {
              level: "error",
              tags: { status: response.status },
            });
            throw new Error(`OpenAI auth error: ${response.status}`);
          }

          if (response.status === 400) {
            Sentry.captureMessage("OpenAI bad request", {
              level: "warning",
              extra: { errorText, messages },
            });
            throw new Error(`OpenAI bad request: ${errorText}`);
          }

          // Error transitorio (429, 5xx) - retry
          if (response.status === 429 || response.status >= 500) {
            if (attempt < MAX_RETRIES - 1) {
              await this.sleep(RETRY_DELAY_MS * (attempt + 1));
              continue;
            }
          }

          throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("No content in OpenAI response");
        }

        return {
          content,
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              }
            : undefined,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // No reintentar errores de auth o validación
        if (lastError.message.includes("auth error") || lastError.message.includes("bad request")) {
          throw lastError;
        }

        // Reintentar timeout y errores de red
        if (attempt < MAX_RETRIES - 1) {
          if (lastError.name === "AbortError" || lastError.message.includes("fetch failed")) {
            await this.sleep(RETRY_DELAY_MS * (attempt + 1));
            continue;
          }
        }

        throw lastError;
      }
    }

    throw lastError || new Error("OpenAI request failed after retries");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
