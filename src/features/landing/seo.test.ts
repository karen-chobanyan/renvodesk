import { describe, expect, it } from "vitest";
import { landingCopy } from "./landing-copy";
import { landingHead, sitemap, siteOrigin } from "./seo";

describe("public page SEO", () => {
  it("keeps unconfigured previews out of search without guessing a domain", () => {
    expect(siteOrigin(undefined)).toBeNull();
    const head = landingHead("fr", null);
    expect(head).toContain('content="noindex, nofollow"');
    expect(head).not.toContain('rel="canonical"');
    expect(head).not.toContain("renvodesk.com");
  });
  it("uses self-canonicals and reciprocal language alternates for a configured origin", () => {
    const origin = siteOrigin("https://renovation.example/");
    for (const locale of ["fr", "en"] as const) {
      const head = landingHead(locale, origin);
      expect(head).toContain(
        `rel="canonical" href="https://renovation.example/${locale === "en" ? "en/" : ""}"`,
      );
      expect(head).toContain(
        'hreflang="fr" href="https://renovation.example/"',
      );
      expect(head).toContain(
        'hreflang="en" href="https://renovation.example/en/"',
      );
      expect(head).toContain('hreflang="x-default"');
      expect(head).toContain(
        'content="index, follow, max-image-preview:large"',
      );
      expect(head).toContain(landingCopy[locale].title);
      const schema = JSON.parse(
        head.match(/data-landing-schema>(.*?)<\/script>/s)?.[1] ?? "{}",
      );
      expect(schema["@type"]).toBe("SoftwareApplication");
      expect(schema).not.toHaveProperty("aggregateRating");
      expect(schema).not.toHaveProperty("offers");
    }
  });
  it("rejects unsafe or ambiguous origins and lists only public language routes", () => {
    for (const input of [
      "http://example.com",
      "https://example.com/path",
      "https://user:pass@example.com",
      "https://example.com?x=1",
      "https://localhost",
      "https://127.0.0.1",
    ])
      expect(() => siteOrigin(input)).toThrow();
    const xml = sitemap("https://renovation.example");
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml).not.toMatch(/workspace|signup|projects|login/);
  });
});
