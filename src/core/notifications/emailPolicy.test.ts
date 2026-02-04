import { describe, it, expect } from "vitest";
import { shouldSendEmailNow, buildEmailSubject, buildEmailBodyText } from "./emailPolicy";

describe("shouldSendEmailNow", () => {
  it("returns true when hour matches", () => {
    const now = new Date("2026-02-07T09:30:00.000Z");
    expect(shouldSendEmailNow({ nowUtc: now, preferredHourUtc: 9 })).toBe(true);
  });

  it("returns false when hour does not match", () => {
    const now = new Date("2026-02-07T09:30:00.000Z");
    expect(shouldSendEmailNow({ nowUtc: now, preferredHourUtc: 10 })).toBe(false);
  });

  it("returns true at midnight (0)", () => {
    const now = new Date("2026-02-07T00:00:00.000Z");
    expect(shouldSendEmailNow({ nowUtc: now, preferredHourUtc: 0 })).toBe(true);
  });

  it("returns true at 23", () => {
    const now = new Date("2026-02-07T23:59:00.000Z");
    expect(shouldSendEmailNow({ nowUtc: now, preferredHourUtc: 23 })).toBe(true);
  });
});

describe("buildEmailSubject", () => {
  it("prefixes title with [Pipos]", () => {
    const n = { type: "X", title: "Sesión pendiente", message: "Hola" };
    expect(buildEmailSubject(n)).toBe("[Pipos] Sesión pendiente");
  });
});

describe("buildEmailBodyText", () => {
  it("combines title, message, signature and unsubscribe hint", () => {
    const n = {
      type: "X",
      title: "Sesión pendiente",
      message: "Hay una sesión planificada para hoy.",
    };
    expect(buildEmailBodyText(n)).toContain("Sesión pendiente");
    expect(buildEmailBodyText(n)).toContain("Hay una sesión planificada");
    expect(buildEmailBodyText(n)).toContain("Pipos Fitness");
    expect(buildEmailBodyText(n)).toContain("Ajustes");
    expect(buildEmailBodyText(n)).toContain("Notificaciones");
  });
});
