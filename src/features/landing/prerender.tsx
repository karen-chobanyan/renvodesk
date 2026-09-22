import { renderToString } from "react-dom/server";
import type { LandingLocale } from "./landing-copy";
import { LandingPage } from "./landing-page";
import { PrivacyPage } from "./privacy-page";

export { landingHead, sitemap, siteOrigin } from "./seo";
export function renderLanding(locale: LandingLocale) {
  return renderToString(<LandingPage locale={locale} />);
}

export { PrivacyPage } from "./privacy-page";

export function renderPrivacy(locale: "fr" | "en") {
  return renderToString(<PrivacyPage locale={locale} />);
}
