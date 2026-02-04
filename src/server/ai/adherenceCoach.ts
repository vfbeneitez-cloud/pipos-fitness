/**
 * AI Coach for adherence insights. Redacta y sugiere; no calcula.
 * Fuente de verdad: computeWeeklyAdherence + getWeeklyAdherenceInsights.
 */

import { z } from "zod";
import { getProvider } from "./getProvider";
import { trackEvent } from "@/src/server/lib/events";
import { logWarn } from "@/src/server/lib/logger";
import { sha256Hex, stableStringify } from "./promptHash";
import {
  ADHERENCE_COACH_PROMPT_VERSION,
  ADHERENCE_COACH_TEMPLATE_HASH,
  ADHERENCE_COACH_SYSTEM_TEMPLATE,
} from "./prompts/adherenceCoach";

export const AiCoachSchema = z
  .object({
    summary: z.string().min(1).max(600),
    bullets: z.array(z.string().min(1).max(180)).min(1).max(5),
    nextActionTitle: z.string().min(1).max(80),
    nextActionSteps: z.array(z.string().min(1).max(160)).min(1).max(5),
    tone: z.enum(["neutral", "motivational"]).optional(),
  })
  .strict();

export type AiCoach = z.infer<typeof AiCoachSchema>;

export type DeterministicInsightPayload = {
  weekStart: string;
  trainingPlan?: { environment?: string; daysPerWeek?: number; sessionMinutes?: number };
  nutritionPlan?: { mealsPerDay?: number; cookingTime?: string };
  breakdown: {
    training: { planned: number; completed: number; percent: number };
    nutrition: { planned: number; completed: number; percent: number };
    totalPercent: number;
  };
  insights: Array<{ type: string; severity: string; title?: string; detail?: string }>;
  nextAction: { type: string; title?: string; detail?: string };
};

export type DeterministicPayload = DeterministicInsightPayload;

export type CoachMeta = {
  providerId: string;
  model: string;
  promptVersion: string;
  promptTemplateHash: string;
  inputShapeHash: string;
  generatedAt: string;
};

export type DeterministicInputShape = {
  weekStart: string;
  training: {
    environment: string | null;
    daysPerWeek: number | null;
    sessionMinutes: number | null;
    planned: number;
    completed: number;
    percent: number;
  };
  nutrition: {
    mealsPerDay: number | null;
    cookingTime: string | null;
    planned: number;
    completed: number;
    percent: number;
  };
  totalPercent: number;
  insights: Array<{ type: string; severity: string }>;
  nextActionType: string;
};

export function buildDeterministicInputShape(
  p: DeterministicInsightPayload,
): DeterministicInputShape {
  return {
    weekStart: p.weekStart,
    training: {
      environment: p.trainingPlan?.environment ?? null,
      daysPerWeek: p.trainingPlan?.daysPerWeek ?? null,
      sessionMinutes: p.trainingPlan?.sessionMinutes ?? null,
      planned: p.breakdown.training.planned,
      completed: p.breakdown.training.completed,
      percent: p.breakdown.training.percent,
    },
    nutrition: {
      mealsPerDay: p.nutritionPlan?.mealsPerDay ?? null,
      cookingTime: p.nutritionPlan?.cookingTime ?? null,
      planned: p.breakdown.nutrition.planned,
      completed: p.breakdown.nutrition.completed,
      percent: p.breakdown.nutrition.percent,
    },
    totalPercent: p.breakdown.totalPercent,
    insights: p.insights.map((i) => ({ type: i.type, severity: i.severity })),
    nextActionType: p.nextAction.type,
  };
}

export function computeInputShapeHash(p: DeterministicInsightPayload): string {
  const shape = buildDeterministicInputShape(p);
  return sha256Hex(stableStringify(shape));
}

function buildUserPrompt(input: DeterministicInsightPayload): string {
  const inputShape = buildDeterministicInputShape(input);
  const dataJson = stableStringify(inputShape);
  return `Datos (JSON):
${dataJson}

Responde SOLO con un JSON válido que cumpla este schema (sin markdown ni texto extra):
{
  "summary": "string 1-600 chars: resumen motivacional",
  "bullets": ["string 1-180 chars cada uno", "máx 5"],
  "nextActionTitle": "string 1-80 chars",
  "nextActionSteps": ["paso 1", "paso 2", "paso 3", "máx 5"],
  "tone": "neutral" | "motivational"
}`;
}

function extractJson(content: string): unknown {
  let raw = content.trim();
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) raw = codeBlock[1].trim();
  return JSON.parse(raw);
}

export async function generateAdherenceCoach(
  input: DeterministicInsightPayload,
  options: { requestId?: string } = {},
): Promise<
  | {
      ok: true;
      coach: AiCoach;
      meta: CoachMeta;
    }
  | { ok: false; reason: string }
> {
  const { requestId } = options;
  const provider = getProvider({ requestId });

  const providerId = provider.id;
  const model = provider.model ?? process.env.AI_MODEL ?? "unknown";

  const inputShapeHash = computeInputShapeHash(input);

  const eventPayload = {
    endpoint: "/api/adherence/insights-ai" as const,
    outcome: "ai_coach_ok" as const,
    requestId,
    providerId,
    model,
    promptVersion: ADHERENCE_COACH_PROMPT_VERSION,
    promptTemplateHash: ADHERENCE_COACH_TEMPLATE_HASH,
    inputShapeHash,
  };

  // En prod, no devolver coach si el provider es mock (evitar IA falsa)
  if (process.env.NODE_ENV === "production" && providerId === "mock") {
    trackEvent(
      "api_adherence_coach_outcome",
      { ...eventPayload, outcome: "ai_disabled_mock_in_prod" as const },
      { sentry: true },
    );
    return { ok: false, reason: "ai_disabled_mock_in_prod" };
  }

  try {
    const userPrompt = buildUserPrompt(input);

    const response = await provider.chat([
      { role: "system", content: ADHERENCE_COACH_SYSTEM_TEMPLATE },
      { role: "user", content: userPrompt },
    ]);

    const parsed = extractJson(response.content);
    const validated = AiCoachSchema.safeParse(parsed);

    if (!validated.success) {
      trackEvent(
        "api_adherence_coach_outcome",
        { ...eventPayload, outcome: "ai_coach_invalid_json" as const },
        { sentry: true },
      );
      logWarn(requestId ?? "no-request-id", "AI coach invalid JSON", {
        error: validated.error.message,
      });
      return { ok: false, reason: "invalid_schema" };
    }

    trackEvent("api_adherence_coach_outcome", eventPayload, { sentry: false });

    return {
      ok: true,
      coach: validated.data,
      meta: {
        providerId,
        model,
        promptVersion: ADHERENCE_COACH_PROMPT_VERSION,
        promptTemplateHash: ADHERENCE_COACH_TEMPLATE_HASH,
        inputShapeHash,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    trackEvent(
      "api_adherence_coach_outcome",
      { ...eventPayload, outcome: "ai_coach_failed" as const },
      { sentry: true },
    );
    logWarn(requestId ?? "no-request-id", "AI coach failed", { error: errMsg });
    return { ok: false, reason: "provider_error" };
  }
}
