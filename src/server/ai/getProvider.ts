import type { AIProvider } from "./provider";
import { MockProvider } from "./providers/mock";
import { OpenAIProvider } from "./providers/openai";

export function getProvider(): AIProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    return new OpenAIProvider(apiKey);
  }
  return new MockProvider();
}
