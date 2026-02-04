import type { AIProvider } from "./provider";
import { MockProvider } from "./providers/mock";
import { trackEvent } from "@/src/server/lib/events";
import { logWarn } from "@/src/server/lib/logger";

export function getProvider(options?: { requestId?: string }): AIProvider {
  const requested = (process.env.AI_PROVIDER ?? "mock").toLowerCase();

  if (requested === "mock") {
    return new MockProvider();
  }

  logWarn(options?.requestId ?? "no-request-id", "AI provider misconfigured, fallback to mock", {
    providerRequested: requested,
  });
  trackEvent(
    "ai_provider_outcome",
    {
      outcome: "ai_misconfigured",
      providerRequested: requested,
      providerId: "mock",
    },
    { sentry: true },
  );
  return new MockProvider();
}
