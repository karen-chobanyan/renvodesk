import type { PdfEstimate } from "@/features/estimates/estimate-pdf";
import { type EstimateLine, estimateTotal } from "@/features/estimates/model";
import type { Project } from "@/features/projects/data";
import type { Locale } from "@/lib/i18n";
import type { demoCompany } from "./demo-directory";
import { type DemoEstimate, type DemoLine, say, tx } from "./demo-types";

export function editorLines(lines: DemoLine[], locale: Locale): EstimateLine[] {
  return lines.map((line) => ({
    id: line.id,
    label: "newLine",
    customDescription: say(line.text, locale),
    quantity: line.quantity,
    price: line.price,
    unit: line.unit,
  }));
}

/** Keeps the bilingual fictional text unless the description was edited. */
export function demoLines(
  edited: EstimateLine[],
  original: DemoLine[],
  locale: Locale,
): DemoLine[] {
  return edited.map((line) => {
    const before = original.find((o) => o.id === line.id);
    const description = (line.customDescription ?? "").trim();
    return {
      id: line.id,
      text:
        before && say(before.text, locale) === description
          ? before.text
          : tx(description, description),
      quantity: line.quantity.trim().replace(",", "."),
      price: line.price.trim().replace(",", "."),
      unit: line.unit,
    };
  });
}

export function demoEstimateTotal(estimate: DemoEstimate) {
  return estimateTotal(editorLines(estimate.lines, "fr")) ?? 0;
}

export function demoPdfEstimate(
  estimate: DemoEstimate,
  project: Project,
  company: typeof demoCompany,
  locale: Locale,
): PdfEstimate {
  return {
    status: estimate.status,
    title: say(estimate.title, locale),
    revision: estimate.revision,
    total_cents: demoEstimateTotal(estimate),
    lines: estimate.lines.map((line) => ({
      id: line.id,
      description: say(line.text, locale),
      quantity: line.quantity,
      price: line.price,
      unit: line.unit,
    })),
    company,
    project: {
      name: project.name,
      client_name: project.client,
      address: project.address,
      city: project.city,
    },
  };
}
