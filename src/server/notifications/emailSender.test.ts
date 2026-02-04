import { describe, it, expect } from "vitest";
import { getEmailSender } from "./emailSender";

describe("getEmailSender", () => {
  it("returns mock sender when NOTIFICATIONS_EMAIL_DRY_RUN is true", () => {
    process.env.NOTIFICATIONS_EMAIL_DRY_RUN = "true";
    const sender = getEmailSender();
    expect(sender.id).toBe("mock");
  });

  it("returns mock sender when dry-run is not set (default)", () => {
    delete process.env.NOTIFICATIONS_EMAIL_DRY_RUN;
    const sender = getEmailSender();
    expect(sender.id).toBe("mock");
  });

  it("returns mock sender when dry-run false but missing API key", () => {
    process.env.NOTIFICATIONS_EMAIL_DRY_RUN = "false";
    process.env.SENDGRID_API_KEY = "";
    process.env.SENDGRID_FROM_EMAIL = "";
    const sender = getEmailSender();
    expect(sender.id).toBe("mock");
  });

  it("returns sendgrid sender when dry-run false and creds present", () => {
    process.env.NOTIFICATIONS_EMAIL_DRY_RUN = "false";
    process.env.SENDGRID_API_KEY = "SG.test";
    process.env.SENDGRID_FROM_EMAIL = "noreply@test.com";
    const sender = getEmailSender();
    expect(sender.id).toBe("sendgrid");
  });
});
