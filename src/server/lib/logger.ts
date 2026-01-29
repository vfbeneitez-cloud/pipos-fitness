/**
 * Server-side structured logger. No PII, no full payloads.
 * Logs JSON to stdout for observability (duration, endpoint, status, errors).
 */

export type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function formatLog(level: LogLevel, requestId: string, msg: string, meta?: LogMeta): string {
  const entry = {
    level,
    requestId,
    msg,
    ...(meta && Object.keys(meta).length > 0 ? meta : {}),
  };
  return JSON.stringify(entry);
}

export function logInfo(requestId: string, msg: string, meta?: LogMeta): void {
  console.log(formatLog("info", requestId, msg, meta));
}

export function logWarn(requestId: string, msg: string, meta?: LogMeta): void {
  console.warn(formatLog("warn", requestId, msg, meta));
}

export function logError(requestId: string, msg: string, meta?: LogMeta): void {
  console.error(formatLog("error", requestId, msg, meta));
}
