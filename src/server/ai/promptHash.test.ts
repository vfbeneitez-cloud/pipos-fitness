import { describe, it, expect } from "vitest";
import { sha256Hex, stableStringify } from "./promptHash";
import {
  ADHERENCE_COACH_TEMPLATE_HASH,
  ADHERENCE_COACH_SYSTEM_TEMPLATE,
} from "./prompts/adherenceCoach";

describe("promptHash", () => {
  it("sha256Hex is stable", () => {
    expect(sha256Hex("hello")).toBe(sha256Hex("hello"));
    expect(sha256Hex("hello")).not.toBe(sha256Hex("world"));
  });

  it("changing input changes hash", () => {
    expect(sha256Hex("x")).not.toBe(sha256Hex("y"));
  });

  it("ADHERENCE_COACH_TEMPLATE_HASH is stable and matches template", () => {
    expect(ADHERENCE_COACH_TEMPLATE_HASH).toBe(sha256Hex(ADHERENCE_COACH_SYSTEM_TEMPLATE));
  });

  it("stableStringify produces stable hash regardless of key order", () => {
    const a = { b: 2, a: 1, nested: { z: 9, y: 8 } };
    const b = { nested: { y: 8, z: 9 }, a: 1, b: 2 };
    expect(sha256Hex(stableStringify(a))).toBe(sha256Hex(stableStringify(b)));
  });
});
