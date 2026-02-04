import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AiCoachSchema,
  buildDeterministicInputShape,
  computeInputShapeHash,
  generateAdherenceCoach,
  type DeterministicInsightPayload,
} from "./adherenceCoach";
import { getProvider } from "./getProvider";

vi.mock("./getProvider", () => ({ getProvider: vi.fn() }));

const validPayload: DeterministicInsightPayload = {
  weekStart: "2026-02-03",
  breakdown: {
    training: { planned: 3, completed: 1, percent: 33 },
    nutrition: { planned: 21, completed: 15, percent: 71 },
    totalPercent: 55,
  },
  insights: [
    {
      type: "TRAINING_LOW_ADHERENCE",
      severity: "high",
      title: "Baja adherencia",
      detail: "1/3 sesiones",
    },
  ],
  nextAction: {
    type: "REDUCE_DAYS_PER_WEEK",
    title: "Reduce días",
    detail: "Prueba con menos días.",
  },
};

const validCoachJson = {
  summary: "Tu adherencia al entrenamiento es baja esta semana.",
  bullets: ["Solo 1 de 3 sesiones completadas.", "La nutrición va mejor."],
  nextActionTitle: "Reduce días de entrenamiento",
  nextActionSteps: [
    "Elige 2 días fijos para entrenar.",
    "Pon recordatorios.",
    "Empieza con sesiones cortas.",
  ],
  tone: "motivational" as const,
};

describe("AiCoachSchema", () => {
  it("valida output válido", () => {
    const result = AiCoachSchema.safeParse(validCoachJson);
    expect(result.success).toBe(true);
  });

  it("rechaza summary vacío", () => {
    const result = AiCoachSchema.safeParse({ ...validCoachJson, summary: "" });
    expect(result.success).toBe(false);
  });

  it("rechaza bullets vacío", () => {
    const result = AiCoachSchema.safeParse({ ...validCoachJson, bullets: [] });
    expect(result.success).toBe(false);
  });
});

describe("generateAdherenceCoach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("caso válido -> coach presente con meta", async () => {
    vi.mocked(getProvider).mockReturnValue({
      id: "mock",
      model: "mock",
      chat: vi.fn().mockResolvedValue({ content: JSON.stringify(validCoachJson) }),
    } as never);

    const result = await generateAdherenceCoach(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.coach.summary).toBe(validCoachJson.summary);
      expect(result.coach.bullets).toEqual(validCoachJson.bullets);
      expect(result.coach.nextActionTitle).toBe(validCoachJson.nextActionTitle);
      expect(result.meta.promptVersion).toBeDefined();
      expect(result.meta.promptTemplateHash).toBeDefined();
      expect(result.meta.inputShapeHash).toBeDefined();
      expect(result.meta.providerId).toBe("mock");
      expect(result.meta.model).toBeDefined();
      expect(result.meta.generatedAt).toBeDefined();
    }
  });

  it("caso inválido (no JSON) -> fallback", async () => {
    vi.mocked(getProvider).mockReturnValue({
      id: "mock",
      model: "mock",
      chat: vi.fn().mockResolvedValue({ content: "no es JSON válido" }),
    } as never);

    const result = await generateAdherenceCoach(validPayload);
    expect(result.ok).toBe(false);
  });

  it("caso inválido (JSON con schema erróneo) -> fallback", async () => {
    vi.mocked(getProvider).mockReturnValue({
      id: "mock",
      model: "mock",
      chat: vi.fn().mockResolvedValue({ content: JSON.stringify({ foo: "bar" }) }),
    } as never);

    const result = await generateAdherenceCoach(validPayload);
    expect(result.ok).toBe(false);
  });

  it("inputShapeHash cambia si cambian números o nextAction.type", () => {
    const payload1 = {
      ...validPayload,
      breakdown: { ...validPayload.breakdown, totalPercent: 55 },
      nextAction: { type: "REDUCE_DAYS_PER_WEEK", title: "A", detail: "B" },
    };
    const payload2 = {
      ...validPayload,
      breakdown: { ...validPayload.breakdown, totalPercent: 60 },
      nextAction: { type: "REDUCE_DAYS_PER_WEEK", title: "A", detail: "B" },
    };
    const payload3 = {
      ...validPayload,
      breakdown: { ...validPayload.breakdown, totalPercent: 55 },
      nextAction: { type: "KEEP_GOING", title: "A", detail: "B" },
    };
    expect(computeInputShapeHash(payload1)).not.toBe(computeInputShapeHash(payload2));
    expect(computeInputShapeHash(payload1)).not.toBe(computeInputShapeHash(payload3));
  });

  it("inputShapeHash no cambia si solo cambian textos (title/detail)", () => {
    const payload1 = {
      ...validPayload,
      insights: [{ type: "TRAINING_LOW_ADHERENCE", severity: "high", title: "Foo", detail: "Bar" }],
      nextAction: { type: "REDUCE_DAYS_PER_WEEK", title: "T1", detail: "D1" },
    };
    const payload2 = {
      ...validPayload,
      insights: [
        { type: "TRAINING_LOW_ADHERENCE", severity: "high", title: "Baz", detail: "Quux" },
      ],
      nextAction: { type: "REDUCE_DAYS_PER_WEEK", title: "T2", detail: "D2" },
    };
    expect(computeInputShapeHash(payload1)).toBe(computeInputShapeHash(payload2));
  });

  it("provider.model tiene prioridad sobre env AI_MODEL", async () => {
    const orig = process.env.AI_MODEL;
    process.env.AI_MODEL = "gpt-4-from-env";
    vi.mocked(getProvider).mockReturnValue({
      id: "mock",
      model: "mock",
      chat: vi.fn().mockResolvedValue({ content: JSON.stringify(validCoachJson) }),
    } as never);

    const result = await generateAdherenceCoach(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.meta.model).toBe("mock");

    process.env.AI_MODEL = orig;
  });

  it("con NODE_ENV=production y provider mock => ok:false ai_disabled_mock_in_prod", async () => {
    vi.mocked(getProvider).mockReturnValue({
      id: "mock",
      model: "mock",
      chat: vi.fn().mockResolvedValue({ content: JSON.stringify(validCoachJson) }),
    } as never);

    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const result = await generateAdherenceCoach(validPayload);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("ai_disabled_mock_in_prod");
    } finally {
      process.env.NODE_ENV = orig;
    }
  });

  it("provider lanza -> fallback", async () => {
    vi.mocked(getProvider).mockReturnValue({
      id: "mock",
      model: "mock",
      chat: vi.fn().mockRejectedValue(new Error("network error")),
    } as never);

    const result = await generateAdherenceCoach(validPayload);
    expect(result.ok).toBe(false);
  });
});
