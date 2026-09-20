import { expect, it } from "vitest";
import { amountInput, exactMoney, parseAmount, validCost } from "./cost-model";

it("parses decimal money without binary multiplication", () => {
  expect(parseAmount("0.29")).toBe(29);
  expect(parseAmount("1,23")).toBe(123);
  expect(parseAmount("1.234")).toBeNull();
  expect(parseAmount("-1")).toBeNull();
  expect(parseAmount("10000000")).toBeNull();
  expect(amountInput(123)).toBe("1.23");
});
it("requires real dates and positive bounded costs", () => {
  const input = {
    description: "Paint",
    category: "materials" as const,
    amount_cents: 1,
    incurred_on: "2026-09-20",
    notes: "",
  };
  expect(validCost(input)).toBe(true);
  expect(validCost({ ...input, amount_cents: 0 })).toBe(false);
  expect(validCost({ ...input, incurred_on: "2026-02-30" })).toBe(false);
  expect(validCost({ ...input, description: " " })).toBe(false);
});
it("formats aggregate totals beyond safe JS integers without losing cents", () => {
  expect(exactMoney(900719925474099129n, "en")).toBe(
    "€9,007,199,254,740,991.29",
  );
  expect(exactMoney(-29n, "en")).toBe("− €0.29");
  expect(exactMoney(0n, "fr")).toBe("0,00 €");
});
