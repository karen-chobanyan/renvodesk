import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildEstimatePdf, type PdfEstimate, pdfMoney } from "./estimate-pdf";

const font = readFileSync("public/fonts/NotoSans-Regular.ttf").toString(
  "base64",
);
const data: PdfEstimate = {
  title: "Rénovation intérieure - étage",
  revision: 2,
  total_cents: 2055,
  company: {
    name: "Atelier & Habitat",
    country: "BE",
    contact_address: "12 rue de la Paix, 1050 Bruxelles",
    contact_email: "bonjour@example.test",
    contact_phone: "+32 2 123 45 67",
  },
  project: {
    name: "Maison Ixelles",
    client_name: "Élodie Cœur",
    address: "18 avenue des Érables",
    city: "Bruxelles",
  },
  lines: [
    {
      id: "1",
      description: "Préparation et peinture des murs",
      quantity: "2",
      price: "10.25",
      unit: "m²",
    },
    {
      id: "2",
      description: "Finition arrondie",
      quantity: "1.5",
      price: "0.03",
      unit: "fixed",
    },
  ],
};
describe("draft PDF", () => {
  it("formats exact cents including the safe-integer boundary", () => {
    expect(pdfMoney(9007199254740991, "en")).toBe("€90,071,992,547,409.91");
    expect(pdfMoney(5, "fr")).toBe("0,05 €");
  });
  it("rejects an inconsistent stored total", () => {
    expect(() =>
      buildEstimatePdf({ ...data, total_cents: 1 }, "fr", font),
    ).toThrow("Saved total mismatch");
  });
  it("generates a single-page French PDF with selectable text", () => {
    const doc = buildEstimatePdf(data, "fr", font);
    expect(doc.getNumberOfPages()).toBe(1);
    writeFileSync(
      "/private/tmp/renvo-pdf-fr.pdf",
      Buffer.from(doc.output("arraybuffer")),
    );
  });
  it("paginates 100 English lines and long descriptions", () => {
    const long = {
      ...data,
      title: "Full renovation estimate",
      lines: Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        description: `Line ${i + 1} - ${i === 0 ? "Detailed renovation works with preparation and finishing. ".repeat(8) : "Preparation, materials and installation."}`,
        quantity: "1",
        price: "10.25",
        unit: "item" as const,
      })),
      total_cents: 102500,
    };
    const doc = buildEstimatePdf(long, "en", font);
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    writeFileSync(
      "/private/tmp/renvo-pdf-en.pdf",
      Buffer.from(doc.output("arraybuffer")),
    );
  });
});
