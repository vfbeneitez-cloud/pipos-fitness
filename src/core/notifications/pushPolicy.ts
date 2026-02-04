/**
 * Policy for when to send push notifications (v1: quiet hours).
 */

export type NotificationForPush = {
  id: string;
  type: string;
  scopeKey: string;
  title: string;
  message: string;
};

/** Quiet hours crossing midnight: e.g. start 22, end 7 → 22-23 and 0-6 are quiet. */
export function isWithinQuietHours(
  nowUtc: Date,
  startHourUtc: number,
  endHourUtc: number,
): boolean {
  const hour = nowUtc.getUTCHours();
  if (startHourUtc <= endHourUtc) {
    return hour >= startHourUtc && hour < endHourUtc;
  }
  return hour >= startHourUtc || hour < endHourUtc;
}

export function shouldSendPushNow(params: {
  nowUtc: Date;
  enabled: boolean;
  startHourUtc: number;
  endHourUtc: number;
}): boolean {
  if (!params.enabled) return false;
  if (isWithinQuietHours(params.nowUtc, params.startHourUtc, params.endHourUtc)) return false;
  return true;
}

export function buildPushPayload(n: NotificationForPush): {
  title: string;
  body: string;
  tag: string;
  data: { notificationId: string; type: string };
} {
  return {
    title: n.title,
    body: n.message,
    tag: n.scopeKey,
    data: { notificationId: n.id, type: n.type },
  };
}
