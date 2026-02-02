import * as Sentry from "@sentry/nextjs";
import { trackEvent } from "@/src/server/lib/events";

type AiAuditResult =
  | { kind: "success" }
  | { kind: "fallback"; fallbackType: string; reason?: string };

type AiAuditContext = {
  context: "createWeeklyPlan" | "adjustWeeklyPlan" | "weeklyCron";
  provider: "openai" | "mock";
  environment: string;
  daysPerWeek: number;
  sessionMinutes: number;
  mealsPerDay: number;
  cookingTime: string;

  poolSize: number;
  allowlistSize?: number;

  sessionsCount?: number;
  totalExercises?: number;
  unmatchedCount?: number;

  durationMs?: number;
};

function shouldSendSuccessToSentry(): boolean {
  // 0 = nunca, 1 = siempre. Default 0.02 (2%)
  const raw = process.env.AI_SUCCESS_SENTRY_SAMPLE_RATE ?? "0.02";
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate <= 0) return false;
  if (rate >= 1) return true;
  return Math.random() < rate;
}

export function trackAiPlanAudit(result: AiAuditResult, ctx: AiAuditContext) {
  const base = {
    context: ctx.context,
    provider: ctx.provider,
    environment: ctx.environment,
    daysPerWeek: ctx.daysPerWeek,
    sessionMinutes: ctx.sessionMinutes,
    mealsPerDay: ctx.mealsPerDay,
    cookingTime: ctx.cookingTime,
    poolSize: ctx.poolSize,
    allowlistSize: ctx.allowlistSize ?? null,
    sessionsCount: ctx.sessionsCount ?? null,
    totalExercises: ctx.totalExercises ?? null,
    unmatchedCount: ctx.unmatchedCount ?? null,
    durationMs: ctx.durationMs ?? null,
  };

  if (result.kind === "fallback") {
    trackEvent(
      "ai_plan_result",
      {
        ...base,
        result: "fallback",
        fallback_type: result.fallbackType,
        reason: result.reason ?? null,
      },
      { sentry: true },
    );
    return;
  }

  // success: enviar a Sentry solo muestreado (para ratio éxito/fallo sin ruido masivo)
  const sentry = shouldSendSuccessToSentry();
  trackEvent("ai_plan_result", { ...base, result: "success" }, { sentry });

  // Si queréis también "métrica" explícita (opcional)
  if (sentry) {
    Sentry.captureMessage("ai_plan_success_sampled", {
      tags: { context: ctx.context, provider: ctx.provider, environment: ctx.environment },
      extra: { ...base },
    });
  }
}
