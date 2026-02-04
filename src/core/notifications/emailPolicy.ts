/**
 * Policy for when to send notification emails (v1: hour match).
 */

export type NotificationForEmail = {
  type: string;
  title: string;
  message: string;
};

/** v1: send if current hour UTC matches preferred hour. */
export function shouldSendEmailNow(params: {
  nowUtc: Date;
  preferredHourUtc: number; // 0..23
}): boolean {
  const hour = params.nowUtc.getUTCHours();
  return hour === params.preferredHourUtc;
}

export function buildEmailSubject(n: NotificationForEmail): string {
  return `[Pipos] ${n.title}`;
}

export function buildEmailBodyText(n: NotificationForEmail): string {
  return `${n.title}\n\n${n.message}\n\n— Pipos Fitness\n\nPuedes desactivar estos emails en Ajustes → Notificaciones.`;
}
