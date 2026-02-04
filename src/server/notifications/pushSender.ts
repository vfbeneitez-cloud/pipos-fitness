/**
 * Push sender abstraction. Mock for dry-run; web-push for production.
 * No PII in logs; no full endpoints in events.
 */

import webpush from "web-push";
import { logWarn } from "@/src/server/lib/logger";
import { trackEvent } from "@/src/server/lib/events";

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushSendResult = { ok: true } | { ok: false; error: string; statusCode?: number };

export interface PushSender {
  id: string; // "mock" | "webpush"
  send(sub: PushSubscriptionRecord, payloadJson: string): Promise<PushSendResult>;
}

const MOCK_ID = "mock";
const WEBPUSH_ID = "webpush";

/** Returns { ok: false } — never marks SENT. Used when VAPID keys missing in prod. */
export class MisconfiguredPushSender implements PushSender {
  id = MOCK_ID;

  async send(_sub: PushSubscriptionRecord, _payload: string): Promise<PushSendResult> {
    trackEvent("push_misconfigured", { outcome: "missing_vapid" });
    logWarn("notifications", "push_misconfigured", { outcome: "missing_vapid" });
    return { ok: false, error: "push_misconfigured" };
  }
}

export class MockPushSender implements PushSender {
  id = MOCK_ID;

  async send(_sub: PushSubscriptionRecord, _payload: string): Promise<PushSendResult> {
    trackEvent("push_dry_run", { senderId: MOCK_ID });
    logWarn("notifications", "push_dry_run", { senderId: MOCK_ID });
    return { ok: true };
  }
}

export class WebPushSender implements PushSender {
  id = WEBPUSH_ID;

  constructor(
    private publicKey: string,
    private privateKey: string,
    private subject: string,
  ) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  async send(sub: PushSubscriptionRecord, payloadJson: string): Promise<PushSendResult> {
    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      await webpush.sendNotification(subscription, payloadJson);
      return { ok: true };
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      const error = err instanceof Error ? err.message : String(err);
      return { ok: false, error, statusCode };
    }
  }
}

export function getPushSender(): PushSender {
  const dryRun = process.env.NOTIFICATIONS_PUSH_DRY_RUN !== "false";
  if (dryRun) {
    return new MockPushSender();
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@piposfitness.local";

  if (!publicKey || !privateKey) {
    return new MisconfiguredPushSender();
  }

  return new WebPushSender(publicKey, privateKey, subject);
}
