import { describe, it, expect } from "vitest";
import { getPushSender } from "./pushSender";

describe("getPushSender", () => {
  it("returns mock when NOTIFICATIONS_PUSH_DRY_RUN is true", () => {
    process.env.NOTIFICATIONS_PUSH_DRY_RUN = "true";
    const sender = getPushSender();
    expect(sender.id).toBe("mock");
  });

  it("returns mock when dry-run false but missing VAPID keys", () => {
    process.env.NOTIFICATIONS_PUSH_DRY_RUN = "false";
    process.env.VAPID_PUBLIC_KEY = "";
    process.env.VAPID_PRIVATE_KEY = "";
    const sender = getPushSender();
    expect(sender.id).toBe("mock");
  });

  it("returns webpush sender when dry-run false and valid VAPID keys present", async () => {
    const webpush = await import("web-push");
    const keys = webpush.default.generateVAPIDKeys();
    process.env.NOTIFICATIONS_PUSH_DRY_RUN = "false";
    process.env.VAPID_PUBLIC_KEY = keys.publicKey;
    process.env.VAPID_PRIVATE_KEY = keys.privateKey;
    const sender = getPushSender();
    expect(sender.id).toBe("webpush");
  });
});
