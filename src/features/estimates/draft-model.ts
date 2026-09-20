import { type EstimateLine, estimateTotal } from "./model";
export type StoredLine = {
  id: string;
  description: string;
  quantity: string;
  price: string;
  unit: EstimateLine["unit"];
};
export function serializeLines(lines: EstimateLine[]): StoredLine[] | null {
  if (
    lines.length > 100 ||
    estimateTotal(lines) === null ||
    new Set(lines.map((l) => l.id)).size !== lines.length
  )
    return null;
  if (
    lines.some(
      (l) =>
        !l.customDescription?.trim() ||
        l.customDescription.trim().length > 500 ||
        !["m²", "fixed", "item"].includes(l.unit),
    )
  )
    return null;
  return lines.map((l) => ({
    id: l.id,
    description: l.customDescription?.trim() ?? "",
    quantity: l.quantity.trim().replace(",", "."),
    price: l.price.trim().replace(",", "."),
    unit: l.unit,
  }));
}
export function editorLines(lines: StoredLine[]): EstimateLine[] {
  return lines.map((l) => ({
    id: l.id,
    label: "newLine",
    customDescription: l.description,
    quantity: l.quantity,
    price: l.price,
    unit: l.unit,
  }));
}
