/**
 * Helpers de fecha para adherencia. UTC weekStart.
 */

const WEEK_START_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseWeekStartParam(
  weekStartStr: string,
): { ok: true; weekStartUtc: Date; weekEndUtc: Date } | { ok: false } {
  if (!WEEK_START_REGEX.test(weekStartStr)) return { ok: false };
  const weekStartUtc = new Date(`${weekStartStr}T00:00:00.000Z`);
  if (Number.isNaN(weekStartUtc.getTime())) return { ok: false };
  const weekEndUtc = new Date(weekStartUtc);
  weekEndUtc.setUTCDate(weekEndUtc.getUTCDate() + 7);
  return { ok: true, weekStartUtc, weekEndUtc };
}

/** Normaliza Date a UTC 00:00:00.000 para coincidir con DB (unique userId+weekStart). */
export function toUtcMidnight(d: Date): Date {
  const s = d.toISOString().slice(0, 10);
  return new Date(`${s}T00:00:00.000Z`);
}

/**
 * Genera lista de weekStarts en UTC [thisWeek, prevWeek, ...] de tamaño N.
 * Cada fecha normalizada a 00:00:00.000Z para coincidir con snapshots en DB.
 */
export function getRecentWeekStartsUtc(weeks: number, now: Date = new Date()): Date[] {
  const clamped = Math.max(1, Math.min(52, weeks));
  const result: Date[] = [];
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  for (let i = 0; i < clamped; i++) {
    const w = new Date(d);
    w.setUTCDate(w.getUTCDate() - 7 * i);
    result.push(toUtcMidnight(w));
  }
  return result;
}
