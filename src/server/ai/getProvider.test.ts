import { describe, it, expect, beforeEach, vi } from "vitest";
import { getProvider } from "./getProvider";

describe("getProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.AI_PROVIDER;
  });

  it("sin AI_PROVIDER => provider.id === 'mock'", () => {
    delete process.env.AI_PROVIDER;
    const provider = getProvider();
    expect(provider.id).toBe("mock");
    expect(provider.model).toBe("mock");
  });

  it("AI_PROVIDER=mock => MockProvider", () => {
    process.env.AI_PROVIDER = "mock";
    const provider = getProvider();
    expect(provider.id).toBe("mock");
  });

  it("AI_PROVIDER no soportado => fallback MockProvider", () => {
    process.env.AI_PROVIDER = "openai";
    const provider = getProvider();
    expect(provider.id).toBe("mock");
  });
});
