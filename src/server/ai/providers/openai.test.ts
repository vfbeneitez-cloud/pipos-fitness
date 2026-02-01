import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { OpenAIProvider, buildOpenAIPayload } from "./openai";

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));

describe("buildOpenAIPayload", () => {
  const messages = [
    { role: "system" as const, content: "You are helpful." },
    { role: "user" as const, content: "Hello" },
  ];

  it("chat endpoint uses max_tokens (not max_output_tokens)", () => {
    const payload = buildOpenAIPayload("chat", messages, 3000);
    expect(payload).toHaveProperty("max_tokens", 3000);
    expect(payload).not.toHaveProperty("max_output_tokens");
    expect(payload).toHaveProperty("messages");
    expect(payload).toHaveProperty("response_format", { type: "json_object" });
  });

  it("responses endpoint uses max_output_tokens (not max_tokens)", () => {
    const payload = buildOpenAIPayload("responses", messages, 3000);
    expect(payload).toHaveProperty("max_output_tokens", 3000);
    expect(payload).not.toHaveProperty("max_tokens");
    expect(payload).toHaveProperty("instructions");
    expect(payload).toHaveProperty("input");
    expect(payload).toHaveProperty("text", { format: { type: "json_object" } });
  });
});

describe("OpenAIProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends max_tokens when using chat completions endpoint", async () => {
    let capturedBody: unknown;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        capturedBody = init?.body ? JSON.parse(init.body as string) : undefined;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: '{"ok":true}' } }],
            }),
            { status: 200 },
          ),
        );
      }),
    );

    const provider = new OpenAIProvider("sk-test");
    await provider.chat([{ role: "user", content: "hi" }], { maxTokens: 1500 });

    expect(capturedBody).toHaveProperty("max_tokens", 1500);
    expect(capturedBody).not.toHaveProperty("max_output_tokens");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/v1/chat/completions"),
      expect.any(Object),
    );
  });

  it("throws OpenAI unauthorized and reports to Sentry on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 }),
        ),
      ),
    );
    const provider = new OpenAIProvider("sk-invalid");
    await expect(provider.chat([{ role: "user", content: "hi" }])).rejects.toThrow(
      "OpenAI unauthorized",
    );
    expect(Sentry.captureMessage).toHaveBeenCalledWith("OpenAI unauthorized", {
      tags: { fallback_type: "provider_error" },
    });
  });

  it("retries once on 429 with backoff then succeeds", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: { message: "Rate limit" } }), { status: 429 }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), {
            status: 200,
          }),
        );
      }),
    );
    const provider = new OpenAIProvider("sk-test");
    const result = await provider.chat([{ role: "user", content: "hi" }]);
    expect(result.content).toBe('{"ok":true}');
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });
});
