import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { Locale } from "@/lib/i18n";
import { editorLines, type StoredLine } from "./draft-model";
import { estimateTotal, hundredths, lineTotal } from "./model";
export type PdfEstimate = {
  title: string;
  revision: number;
  total_cents: number;
  lines: StoredLine[];
  company: {
    name: string;
    country: string;
    contact_address: string;
    contact_email: string;
    contact_phone: string;
  };
  project: { name: string; client_name: string; address: string; city: string };
};
export function pdfMoney(cents: number, locale: Locale) {
  if (!Number.isSafeInteger(cents) || cents < 0)
    throw new Error("Invalid money");
  const n = BigInt(cents),
    whole = new Intl.NumberFormat(locale === "fr" ? "fr-BE" : "en-IE", {
      maximumFractionDigits: 0,
    })
      .format(n / 100n)
      .replaceAll("\u202f", " ");
  const amount = `${whole}${locale === "fr" ? "," : "."}${String(n % 100n).padStart(2, "0")}`;
  return locale === "fr" ? `${amount} €` : `€${amount}`;
}
const copy = {
  fr: {
    draft: "BROUILLON",
    estimate: "Devis",
    company: "Entreprise",
    contact: "Coordonnées",
    client: "Client",
    site: "Chantier",
    revision: "Révision",
    description: "Description",
    quantity: "Qté",
    unit: "Unité",
    price: "Prix unit. HT",
    total: "Total HT",
    subtotal: "Total hors taxes",
    fixed: "forfait",
    item: "unité",
    notice:
      "Brouillon non accepté - TVA non calculée. Ce document n’est pas une facture.",
    empty: "Aucune ligne",
    countries: { BE: "Belgique", FR: "France", NL: "Pays-Bas" },
  },
  en: {
    draft: "DRAFT",
    estimate: "Estimate",
    company: "Company",
    contact: "Contact details",
    client: "Client",
    site: "Project / site",
    revision: "Revision",
    description: "Description",
    quantity: "Qty",
    unit: "Unit",
    price: "Unit price excl. tax",
    total: "Total excl. tax",
    subtotal: "Total excluding tax",
    fixed: "fixed",
    item: "item",
    notice:
      "Unaccepted draft - VAT not calculated. This document is not an invoice.",
    empty: "No line items",
    countries: { BE: "Belgium", FR: "France", NL: "Netherlands" },
  },
};
export function buildEstimatePdf(
  data: PdfEstimate,
  locale: Locale,
  font: string,
) {
  const c = copy[locale],
    lines = editorLines(data.lines);
  if (estimateTotal(lines) !== data.total_cents)
    throw new Error("Saved total mismatch");
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  doc.addFileToVFS("NotoSans.ttf", font);
  doc.addFont("NotoSans.ttf", "NotoSans", "normal");
  doc.setFont("NotoSans");
  doc.setProperties({
    title: `${c.draft} - ${data.title}`,
    author: data.company.name,
    subject: c.notice,
  });
  const common = {
    font: "NotoSans",
    fontStyle: "normal" as const,
    fontSize: 9,
    cellPadding: 3,
    textColor: [35, 45, 43] as [number, number, number],
    overflow: "linebreak" as const,
  };
  let bottom = 35;
  autoTable(doc, {
    startY: 30,
    margin: { left: 18, right: 18, top: 30, bottom: 24 },
    theme: "plain",
    styles: common,
    columnStyles: {
      0: { cellWidth: 36, textColor: [100, 115, 106] },
      1: { cellWidth: 138 },
    },
    body: [
      [c.estimate, data.title],
      [c.revision, String(data.revision)],
      [c.company, data.company.name],
      [
        c.contact,
        [
          data.company.contact_address,
          c.countries[data.company.country as "BE" | "FR" | "NL"] ??
            data.company.country,
          data.company.contact_email,
          data.company.contact_phone,
        ]
          .filter(Boolean)
          .join("\n"),
      ],
      [c.client, data.project.client_name],
      [
        c.site,
        [data.project.name, data.project.address, data.project.city]
          .filter(Boolean)
          .join("\n"),
      ],
    ],
    didDrawPage: (hook) => {
      bottom = hook.cursor?.y ?? bottom;
    },
  });
  autoTable(doc, {
    startY: bottom + 8,
    margin: { left: 18, right: 18, top: 30, bottom: 24 },
    theme: "plain",
    styles: { ...common, fontSize: 8 },
    headStyles: {
      fillColor: [39, 76, 98],
      textColor: 255,
      fontStyle: "normal",
    },
    bodyStyles: { lineWidth: { bottom: 0.15 }, lineColor: [225, 230, 225] },
    rowPageBreak: "avoid",
    showHead: "everyPage",
    showFoot: "lastPage",
    columnStyles: {
      0: { cellWidth: 64 },
      1: { cellWidth: 18, halign: "right" },
      2: { cellWidth: 18 },
      3: { cellWidth: 34, halign: "right" },
      4: { cellWidth: 40, halign: "right" },
    },
    head: [[c.description, c.quantity, c.unit, c.price, c.total]],
    body: lines.length
      ? lines.map((l) => [
          l.customDescription ?? "",
          new Intl.NumberFormat(locale === "fr" ? "fr-BE" : "en-IE", {
            maximumFractionDigits: 2,
          }).format(Number(l.quantity)),
          l.unit === "m²" ? "m²" : c[l.unit],
          pdfMoney(Number(hundredths(l.price)), locale),
          pdfMoney(lineTotal(l) ?? 0, locale),
        ])
      : [[{ content: c.empty, colSpan: 5 }]],
    foot: [
      [
        { content: c.subtotal, colSpan: 4, styles: { halign: "right" } },
        pdfMoney(data.total_cents, locale),
      ],
    ],
    footStyles: {
      halign: "right",
      fillColor: [240, 244, 238],
      textColor: [35, 45, 43],
      fontStyle: "normal",
      fontSize: 10,
    },
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("NotoSans", "normal");
    doc.setTextColor(39, 76, 98);
    doc.setFontSize(13);
    doc.text("RenvoDesk", 18, 17);
    doc.setFontSize(10);
    doc.text(c.draft, 192, 17, { align: "right" });
    doc.setDrawColor(220, 226, 220);
    doc.line(18, 22, 192, 22);
    doc.setFontSize(8);
    doc.setTextColor(90, 103, 95);
    doc.text(c.notice, 18, 282);
    doc.text(`${page} / ${pages}`, 192, 289, { align: "right" });
  }
  return doc;
}
export async function downloadEstimatePdf(data: PdfEstimate, locale: Locale) {
  const response = await fetch("/fonts/NotoSans-Regular.ttf");
  if (!response.ok) throw new Error("Font unavailable");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  const doc = buildEstimatePdf(data, locale, btoa(raw));
  const name =
    data.title
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "estimate";
  doc.save(
    `${locale === "fr" ? "brouillon" : "draft"}-${name}-r${data.revision}.pdf`,
  );
}
