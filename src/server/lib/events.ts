/**
 * Event tracking for beta diagnostics. No PII, no user content.
 *
 * Outcome taxonomy (snake_case):
 *
 * | Event                       | outcome                    | Cuándo |
 * |-----------------------------|----------------------------|--------|
 * | api_adherence_coach_outcome | ai_coach_ok                | IA devolvió JSON válido |
 * | api_adherence_coach_outcome | ai_coach_invalid_json      | IA devolvió JSON no conforme schema |
 * | api_adherence_coach_outcome | ai_coach_failed            | Provider lanzó / parse error |
 * | api_adherence_coach_outcome | ai_disabled_mock_in_prod   | NODE_ENV=prod + provider mock |
 * | ai_provider_outcome         | ai_misconfigured           | AI_PROVIDER no soportado, fallback mock |
 *
 * Otros eventos:
 * - rate_limit: 429 en endpoints sensibles (path, retryAfter)
 * - weekly_plan_get_*: success/unauthorized/badRequest/error
 * - training_log_post_*: success/unauthorized/badRequest
 * - nutrition_log_post_*: success/unauthorized/badRequest
 * - nutrition_swap_post_*: success/error/badRequest
 * - cron_weekly_regenerate: processed, succeeded, failed, skippedLocked (numéricos)
 * - agent_adjustments_applied: fallback_type (red_flag|parse_error|provider_error|none)
 * - ai_exercise_unmatched: count (número de ejercicios IA sin match en DB)
 *
 * Production: Sentry solo para importantes (errors, 429, fallbacks). Dev/test: logger.info.
 * Permitido: números, códigos cortos. Bloqueado: notes, painNotes, message, emails, meal content.
 */

import * as Sentry from "@sentry/nextjs";
import { logInfo } from "./logger";

const BLOCKED_KEYS = new Set([
  "notes",
  "painNotes",
  "message",
  "email",
  "body",
  "content",
  "description",
  "rationale",
  "allergies",
  "dislikes",
  "equipmentNotes",
  "injuryNotes",
]);

const MAX_STRING_LEN = 50;

/** Keys allowed to exceed MAX_STRING_LEN (e.g. sha256 hashes for observability). */
const ALLOWED_LONG_KEYS = new Set(["prompttemplatehash", "inputshapehash"]);

function sanitize(data: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    const key = k.toLowerCase();
    if (BLOCKED_KEYS.has(key)) continue;
    if (typeof v === "string" && v.length > MAX_STRING_LEN && !ALLOWED_LONG_KEYS.has(key)) continue;
    if (typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date)) continue;
    if (typeof v === "number" || typeof v === "boolean" || v === null) {
      out[k] = v;
      continue;
    }
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

const isProd = process.env.NODE_ENV === "production";
const isTest = !!process.env.VITEST;

export function trackEvent(
  name: string,
  data?: Record<string, unknown>,
  options?: { sentry?: boolean },
): void {
  const clean = sanitize(data ?? {});

  if (!isProd || isTest) {
    logInfo("events", name, clean);
    return;
  }

  if (options?.sentry) {
    try {
      Sentry.captureMessage(name, { level: "info", extra: clean });
    } catch {
      // Sentry not available
    }
  }
}
