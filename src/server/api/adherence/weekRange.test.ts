import { describe, it, expect } from "vitest";
import { parseWeekStartParam, getRecentWeekStartsUtc, toUtcMidnight } from "./weekRange";

describe("parseWeekStartParam", () => {
  it("parses YYYY-MM-DD to UTC weekStart and weekEnd", () => {
    const result = parseWeekStartParam("2026-02-03");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.weekStartUtc.toISOString()).toBe("2026-02-03T00:00:00.000Z");
      expect(result.weekEndUtc.toISOString()).toBe("2026-02-10T00:00:00.000Z");
    }
  });

  it("returns ok:false for invalid format", () => {
    expect(parseWeekStartParam("")).toEqual({ ok: false });
    expect(parseWeekStartParam("2026-2-3")).toEqual({ ok: false });
    expect(parseWeekStartParam("invalid")).toEqual({ ok: false });
  });
});

describe("getRecentWeekStartsUtc", () => {
  it("returns N week starts", () => {
    const result = getRecentWeekStartsUtc(8, new Date("2026-02-05T12:00:00.000Z"));
    expect(result.length).toBe(8);
  });

  it("clamps weeks to 1..52", () => {
    expect(getRecentWeekStartsUtc(0, new Date()).length).toBe(1);
    expect(getRecentWeekStartsUtc(100, new Date()).length).toBe(52);
  });

  it("first week is Monday 00:00 UTC", () => {
    const result = getRecentWeekStartsUtc(1, new Date("2026-02-05T12:00:00.000Z"));
    expect(result[0].getUTCDay()).toBe(1);
    expect(result[0].getUTCHours()).toBe(0);
  });

  it("toUtcMidnight normalizes to 00:00:00.000Z", () => {
    const d = new Date("2026-02-03T14:30:45.123Z");
    const normalized = toUtcMidnight(d);
    expect(normalized.toISOString()).toBe("2026-02-03T00:00:00.000Z");
  });
});
