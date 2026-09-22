import { renderToString } from "react-dom/server";
import type { LandingLocale } from "./landing-copy";
import { LandingPage } from "./landing-page";

export { landingHead, sitemap, siteOrigin } from "./seo";
export function renderLanding(locale: LandingLocale) {
  return renderToString(<LandingPage locale={locale} />);
}
