/**
 * Email sender abstraction. Mock for dry-run; SendGrid for production.
 * No PII in logs; no full email content in events.
 */

import sgMail from "@sendgrid/mail";
import { logWarn } from "@/src/server/lib/logger";
import { trackEvent } from "@/src/server/lib/events";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type EmailSendResult = { ok: true } | { ok: false; error: string };

export interface EmailSender {
  id: string; // "mock" | "sendgrid"
  send(msg: EmailMessage): Promise<EmailSendResult>;
}

const MOCK_ID = "mock";
const SENDGRID_ID = "sendgrid";
const MISCONFIG_ID = "mock"; // same id but returns fail

/** Returns { ok: false } — never marks SENT. Used when creds missing in prod. */
export class MisconfiguredEmailSender implements EmailSender {
  id = MISCONFIG_ID;

  async send(_msg: EmailMessage): Promise<EmailSendResult> {
    trackEvent("email_misconfigured", { outcome: "missing_creds" });
    logWarn("notifications", "email_misconfigured", { outcome: "missing_creds" });
    return { ok: false, error: "email_misconfigured" };
  }
}

export class MockEmailSender implements EmailSender {
  id = MOCK_ID;

  async send(_msg: EmailMessage): Promise<EmailSendResult> {
    logWarn("notifications", "email_dry_run", { senderId: MOCK_ID });
    trackEvent("email_dry_run", { senderId: MOCK_ID });
    return { ok: true };
  }
}

export class SendGridEmailSender implements EmailSender {
  id = SENDGRID_ID;

  constructor(
    private apiKey: string,
    private fromEmail: string,
    private fromName: string,
  ) {
    sgMail.setApiKey(apiKey);
  }

  async send(msg: EmailMessage): Promise<EmailSendResult> {
    try {
      await sgMail.send({
        to: msg.to,
        from: { email: this.fromEmail, name: this.fromName },
        subject: msg.subject,
        text: msg.text,
      });
      return { ok: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { ok: false, error };
    }
  }
}

export function getEmailSender(): EmailSender {
  const dryRun = process.env.NOTIFICATIONS_EMAIL_DRY_RUN !== "false";
  if (dryRun) {
    return new MockEmailSender();
  }

  const apiKey = process.env.SENDGRID_API_KEY ?? "";
  const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? "";
  const fromName = process.env.SENDGRID_FROM_NAME ?? "Pipos Fitness";

  if (!apiKey || !fromEmail) {
    return new MisconfiguredEmailSender();
  }

  return new SendGridEmailSender(apiKey, fromEmail, fromName);
}
