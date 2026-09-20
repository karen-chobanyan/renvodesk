import { describe, expect, it } from "vitest";
import { editorLines, serializeLines } from "./draft-model";
import { type EstimateLine, estimateTotal } from "./model";

const line: EstimateLine = {
  id: "one",
  label: "newLine",
  customDescription: " Painting ",
  quantity: "1,5",
  price: "0,03",
  unit: "m²",
};
describe("persisted draft validation", () => {
  it("normalizes decimals and round-trips descriptions without localization", () => {
    const stored = serializeLines([line]);
    expect(stored?.[0]).toMatchObject({
      description: "Painting",
      quantity: "1.5",
      price: "0.03",
    });
    expect(estimateTotal(editorLines(stored ?? []))).toBe(5);
  });
  it("rejects blank descriptions, duplicate ids and excessive line count", () => {
    expect(serializeLines([{ ...line, customDescription: " " }])).toBeNull();
    expect(serializeLines([line, line])).toBeNull();
    expect(
      serializeLines(
        Array.from({ length: 101 }, (_, i) => ({ ...line, id: String(i) })),
      ),
    ).toBeNull();
  });
  it("rejects invalid quantity, price precision and unsafe totals", () => {
    expect(serializeLines([{ ...line, quantity: "0" }])).toBeNull();
    expect(serializeLines([{ ...line, price: "1.234" }])).toBeNull();
    expect(
      serializeLines([
        { ...line, quantity: "9999999.99", price: "9999999.99" },
      ]),
    ).toBeNull();
  });
  it("supports an empty draft and zero-priced valid lines", () => {
    expect(serializeLines([])).toEqual([]);
    expect(serializeLines([{ ...line, price: "0" }])).not.toBeNull();
  });
});
