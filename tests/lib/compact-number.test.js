import { describe, it, expect } from "vitest";
import { parseCompactNumber } from "../../src/lib/compact-number.js";

describe("parseCompactNumber", () => {
  it("parses_plain_numbers", () => {
    expect(parseCompactNumber("1000")).toEqual({ value: 1000 });
    expect(parseCompactNumber(2500)).toEqual({ value: 2500 });
  });

  it("parses_compact_suffixes", () => {
    expect(parseCompactNumber("1k")).toEqual({ value: 1000 });
    expect(parseCompactNumber("2.5m")).toEqual({ value: 2500000 });
    expect(parseCompactNumber("3b")).toEqual({ value: 3000000000 });
  });

  it("parses_numbers_with_commas_and_spaces", () => {
    expect(parseCompactNumber("1,250")).toEqual({ value: 1250 });
    expect(parseCompactNumber("1.5 k")).toEqual({ value: 1500 });
  });

  it("rejects_invalid_values", () => {
    expect(parseCompactNumber("abc").error).toContain("Use a number like");
    expect(parseCompactNumber("1t").error).toContain("Use a number like");
  });

  it("rejects_negative_numbers", () => {
    expect(parseCompactNumber(-100).error).toContain("Use a number like");
    expect(parseCompactNumber("-100").error).toContain("Use a number like");
  });
});