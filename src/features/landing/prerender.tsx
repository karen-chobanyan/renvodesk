import { renderToString } from "react-dom/server";
import type { LandingLocale } from "./landing-copy";
import { LandingPage } from "./landing-page";
import type { LegalKind } from "./legal-copy";
import { LegalPage } from "./legal-page";

export { escapeHtml, landingHead, sitemap, siteOrigin } from "./seo";
export function renderLanding(locale: LandingLocale) {
  return renderToString(<LandingPage locale={locale} />);
}

export { legalCopy } from "./legal-copy";

export function renderLegal(locale: "fr" | "en", kind: LegalKind) {
  return renderToString(<LegalPage locale={locale} kind={kind} />);
}
