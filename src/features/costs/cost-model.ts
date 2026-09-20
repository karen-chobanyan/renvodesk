import { hundredths } from "@/features/estimates/model";
import { validDate } from "@/features/tasks/task-model";
export const categories = [
  "materials",
  "labor",
  "subcontractors",
  "other",
] as const;
export type CostInput = {
  description: string;
  category: (typeof categories)[number];
  amount_cents: number;
  incurred_on: string;
  notes: string;
};
export function parseAmount(value: string) {
  const n = hundredths(value);
  return n === null ? null : Number(n);
}
export function validCost(input: CostInput) {
  return (
    input.description.trim().length > 0 &&
    input.description.trim().length <= 200 &&
    categories.includes(input.category) &&
    Number.isSafeInteger(input.amount_cents) &&
    input.amount_cents > 0 &&
    input.amount_cents <= 999999999 &&
    validDate(input.incurred_on) &&
    input.notes.length <= 2000
  );
}
export function amountInput(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
export function exactMoney(cents: bigint, locale: "fr" | "en") {
  const absolute = cents < 0n ? -cents : cents;
  const whole = new Intl.NumberFormat(
    locale === "fr" ? "fr-BE" : "en-IE",
  ).format(absolute / 100n);
  const fraction = String(absolute % 100n).padStart(2, "0");
  const amount = `${whole}${locale === "fr" ? "," : "."}${fraction}`;
  return `${cents < 0n ? "− " : ""}${locale === "en" ? "€" : ""}${amount}${locale === "fr" ? " €" : ""}`;
}
