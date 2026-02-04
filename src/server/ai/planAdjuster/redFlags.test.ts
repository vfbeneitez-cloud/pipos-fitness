import { describe, it, expect } from "vitest";
import { detectRedFlags } from "./redFlags";

describe("detectRedFlags", () => {
  it("returns detected: false when no logs (no red flags)", () => {
    expect(detectRedFlags([])).toEqual({ detected: false });
  });

  it("returns detected: false when no pain", () => {
    expect(detectRedFlags([{ pain: false, painNotes: null }])).toEqual({ detected: false });
  });

  it("returns detected: false when pain but no red-flag keywords", () => {
    expect(detectRedFlags([{ pain: true, painNotes: "molestia leve en hombro" }])).toEqual({
      detected: false,
    });
  });

  it("returns detected: true with message when pain + red-flag keyword", () => {
    const r = detectRedFlags([{ pain: true, painNotes: "dolor agudo en espalda" }]);
    expect(r.detected).toBe(true);
    expect(r.message).toContain("profesional sanitario");
  });

  it("returns detected: true for lesion keyword", () => {
    const r = detectRedFlags([{ pain: true, painNotes: "posible lesión" }]);
    expect(r.detected).toBe(true);
  });
});
