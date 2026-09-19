import type { Key } from "@/lib/i18n";
export type EstimateLine = {
  id: string;
  label: Key;
  customDescription?: string;
  quantity: string;
  price: string;
  unit: "m²" | "fixed" | "item";
};
export const initialLines: EstimateLine[] = [
  {
    id: "paint",
    label: "estimatePaint",
    quantity: "120",
    price: "28.50",
    unit: "m²",
  },
  {
    id: "floor",
    label: "estimateFloor",
    quantity: "65",
    price: "74.00",
    unit: "m²",
  },
  {
    id: "electric",
    label: "estimateElectrical",
    quantity: "12",
    price: "95.00",
    unit: "item",
  },
];
// Parse decimal strings into integer hundredths; do not multiply floating point prices.
export function hundredths(value: string): bigint | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
export function lineTotal(line: EstimateLine): number | null {
  const quantity = hundredths(line.quantity),
    price = hundredths(line.price);
  if (quantity === null || price === null || quantity <= 0n) return null;
  const rounded = (quantity * price + 50n) / 100n;
  return rounded <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(rounded) : null;
}
export function estimateTotal(lines: EstimateLine[]): number | null {
  let total = 0;
  for (const line of lines) {
    const amount = lineTotal(line);
    if (amount === null) return null;
    total += amount;
    if (!Number.isSafeInteger(total)) return null;
  }
  return total;
}
