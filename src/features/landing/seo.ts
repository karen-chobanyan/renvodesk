import { type LandingLocale, landingCopy } from "./landing-copy";

export function siteOrigin(value: string | undefined) {
  if (!value) return null;
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".local") ||
    /^[\d.]+$/.test(url.hostname)
  )
    throw new Error(
      "SITE_URL must be a verified public HTTPS origin without a path, credentials or query.",
    );
  return url.origin;
}
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char,
  );
export function landingHead(locale: LandingLocale, origin: string | null) {
  const c = landingCopy[locale];
  const path = locale === "fr" ? "/" : "/en/";
  const canonical = origin ? `${origin}${path}` : null;
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "RenvoDesk",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: ["fr", "en"],
    description: c.description,
    ...(canonical ? { url: canonical } : {}),
    featureList: c.features.map((feature) => feature.title),
  };
  return `<title>${escapeHtml(c.title)}</title>
<meta name="description" content="${escapeHtml(c.description)}" />
<meta name="robots" content="${origin ? "index, follow, max-image-preview:large" : "noindex, nofollow"}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="RenvoDesk" />
<meta property="og:title" content="${escapeHtml(c.title)}" />
<meta property="og:description" content="${escapeHtml(c.description)}" />
<meta property="og:locale" content="${locale === "fr" ? "fr_BE" : "en_GB"}" />
<meta property="og:locale:alternate" content="${locale === "fr" ? "en_GB" : "fr_BE"}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(c.title)}" />
<meta name="twitter:description" content="${escapeHtml(c.description)}" />
${
  origin
    ? `<link rel="canonical" href="${escapeHtml(canonical ?? "")}" />
<link rel="alternate" hreflang="fr" href="${escapeHtml(origin)}/" />
<link rel="alternate" hreflang="en" href="${escapeHtml(origin)}/en/" />
<link rel="alternate" hreflang="x-default" href="${escapeHtml(origin)}/" />
<meta property="og:url" content="${escapeHtml(canonical ?? "")}" />
<meta property="og:image" content="${escapeHtml(origin)}/images/renovation-interior.jpg" />
<meta property="og:image:width" content="1536" />
<meta property="og:image:height" content="1024" />
<meta property="og:image:alt" content="${escapeHtml(c.siteAlt)}" />
<meta name="twitter:image" content="${escapeHtml(origin)}/images/renovation-interior.jpg" />`
    : ""
}
<script type="application/ld+json" data-landing-schema>${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`;
}
export function sitemap(origin: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/en/"].map((path) => `<url><loc>${escapeHtml(origin + path)}</loc></url>`).join("")}</urlset>\n`;
}
