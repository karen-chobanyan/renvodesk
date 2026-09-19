import { describe, expect, it } from "vitest";
import { en, formatMoney, fr } from "./i18n";

describe("locales", () => {
  it("has matching English and French keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });
  it("formats currency according to locale", () => {
    expect(formatMoney(123450, "fr")).toContain("1");
    expect(formatMoney(123450, "en")).toBe("€1,234.5");
    expect(formatMoney(123450, "fr")).not.toEqual(formatMoney(123450, "en"));
  });
});
