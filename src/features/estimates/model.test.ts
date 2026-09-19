import { describe, expect, it } from "vitest";
import { estimateTotal, hundredths, initialLines, lineTotal } from "./model";

describe("estimate amounts", () => {
  it("accepts French decimals without floating point drift", () => {
    expect(hundredths("0,29")).toBe(29n);
    expect(
      lineTotal({ ...initialLines[0], quantity: "3", price: "0.29" }),
    ).toBe(87);
  });
  it("rounds fractional quantities half up at line level", () => {
    expect(
      lineTotal({ ...initialLines[0], quantity: "0.5", price: "0.01" }),
    ).toBe(1);
  });
  it("calculates initial estimate", () => {
    expect(estimateTotal(initialLines)).toBe(937000);
  });
  it("rejects negative, malformed, unsafe and over-precision inputs", () => {
    for (const input of [
      "-1",
      "1e3",
      "",
      "1.005",
      "12,34.56",
      "999999999999999999",
    ])
      expect(hundredths(input)).toBeNull();
    expect(lineTotal({ ...initialLines[0], quantity: "0" })).toBeNull();
    expect(
      lineTotal({ ...initialLines[0], quantity: "9999999", price: "9999999" }),
    ).toBeNull();
  });
  it("does not silently total invalid lines", () => {
    expect(estimateTotal([{ ...initialLines[0], price: "bad" }])).toBeNull();
  });
});
