import { describe, it, expect } from "vitest";
import { isWithinQuietHours, shouldSendPushNow, buildPushPayload } from "./pushPolicy";

describe("isWithinQuietHours", () => {
  it("same day range: 9-17, hour 12 is quiet", () => {
    const d = new Date("2026-02-08T12:00:00.000Z");
    expect(isWithinQuietHours(d, 9, 17)).toBe(true);
  });

  it("same day range: 9-17, hour 8 is not quiet", () => {
    const d = new Date("2026-02-08T08:00:00.000Z");
    expect(isWithinQuietHours(d, 9, 17)).toBe(false);
  });

  it("crossing midnight: 22-7, hour 23 is quiet", () => {
    const d = new Date("2026-02-08T23:00:00.000Z");
    expect(isWithinQuietHours(d, 22, 7)).toBe(true);
  });

  it("crossing midnight: 22-7, hour 3 is quiet", () => {
    const d = new Date("2026-02-08T03:00:00.000Z");
    expect(isWithinQuietHours(d, 22, 7)).toBe(true);
  });

  it("crossing midnight: 22-7, hour 10 is not quiet", () => {
    const d = new Date("2026-02-08T10:00:00.000Z");
    expect(isWithinQuietHours(d, 22, 7)).toBe(false);
  });

  it("crossing midnight: 22-7, hour 7 is not quiet (end exclusive)", () => {
    const d = new Date("2026-02-08T07:00:00.000Z");
    expect(isWithinQuietHours(d, 22, 7)).toBe(false);
  });
});

describe("shouldSendPushNow", () => {
  it("returns false when enabled=false", () => {
    const d = new Date("2026-02-08T10:00:00.000Z");
    expect(shouldSendPushNow({ nowUtc: d, enabled: false, startHourUtc: 22, endHourUtc: 7 })).toBe(
      false,
    );
  });

  it("returns false when within quiet hours", () => {
    const d = new Date("2026-02-08T23:00:00.000Z");
    expect(shouldSendPushNow({ nowUtc: d, enabled: true, startHourUtc: 22, endHourUtc: 7 })).toBe(
      false,
    );
  });

  it("returns true when enabled and not quiet", () => {
    const d = new Date("2026-02-08T10:00:00.000Z");
    expect(shouldSendPushNow({ nowUtc: d, enabled: true, startHourUtc: 22, endHourUtc: 7 })).toBe(
      true,
    );
  });
});

describe("buildPushPayload", () => {
  it("returns title, body, tag from scopeKey, data with notificationId and type", () => {
    const n = {
      id: "n123",
      type: "TODAY_TRAINING_REMINDER",
      scopeKey: "day:2026-02-08",
      title: "Sesión pendiente",
      message: "Hay una sesión planificada.",
    };
    const payload = buildPushPayload(n);
    expect(payload.title).toBe("Sesión pendiente");
    expect(payload.body).toBe("Hay una sesión planificada.");
    expect(payload.tag).toBe("day:2026-02-08");
    expect(payload.data.notificationId).toBe("n123");
    expect(payload.data.type).toBe("TODAY_TRAINING_REMINDER");
  });
});
