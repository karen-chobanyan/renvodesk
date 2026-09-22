# Publishing the public landing page

`pnpm dev` serves French at `/` and English at `/en/`. `pnpm build` emits their
complete HTML to `dist/index.html` and `dist/en/index.html`, plus a separate
`dist/app.html` application shell. No hosting provider has been selected or deployed.

## Production configuration

Set `SITE_URL` to the verified public HTTPS origin at build time, then run
`pnpm build`. It must contain no path, query or credentials. This is build-only
configuration, not a VITE browser variable. Do not assume ownership of renvodesk.com.
Unset it for previews: the public pages will carry noindex and omit the sitemap,
canonical URLs and absolute social image URLs. Rebuild when the origin changes.

Configure the chosen host in this order:

1. Serve static assets with their correct content types. Cache hashed assets
   immutably; revalidate HTML, robots.txt and sitemap.xml on deployment.
2. Serve `/` from `index.html` and `/en/` from `en/index.html`. Redirect `/en` to
   `/en/` permanently. Redirect alternate hostnames and HTTP to the chosen HTTPS origin.
3. Rewrite recognized application routes (auth, invite, workspace, demo projects,
   estimates and design-system) to `app.html`. Preserve the URL and query string.
   The route tree in `src/app-entry.tsx` is authoritative. Do not use the landing
   HTML as a catch-all: its production metadata is intended for the public root.
4. Return HTTP 404 for unknown routes and missing assets. Keep private application
   pages noindex; authentication and database RLS remain the access controls.

## Verification and discovery

Run `node scripts/check-landing-build.mjs` after a preview build. For a production
build pass the same `SITE_URL` to this check. It opens a temporary local server and
Chromium, verifies FR/EN content with JavaScript disabled, native FAQ behavior,
metadata, client hydration and the noindex application shell. Chromium must be
installed (`pnpm exec playwright install chromium`).

After deployment, check actual HTTP status codes and view-source for both locales,
canonical/hreflang URLs, indexable robots metadata and a reachable social image.
Verify signup/auth redirects and the fictional demo. Measure real mobile Core Web
Vitals once hosting is known; local tests do not establish production performance.
Verify the domain in Google Search Console, submit `/sitemap.xml`, and inspect both
public URLs. This enables discovery; it does not guarantee indexing or rankings.
No conversion analytics, cookie banner or tracking service has been added.

The interior photo is an AI-generated architectural illustration, not a customer
project. Its source asset is `public/images/renovation-interior.jpg`.

References: Google's [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[localized pages](https://developers.google.com/search/docs/specialty/international/localized-versions),
[sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
and [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

Product screenshots in `public/images/product/` are actual application renders at
1440 × 1000 in French and English. Project overview/tasks/costs use fictional API
fixtures based on `tests/project-activity.spec.ts`; the estimate uses the public
`/estimates/maison-ixelles` demo. No customer data is present. Refresh these images
when the corresponding interface changes. Screenshots are expandable, with the
hero loaded eagerly and feature images loaded lazily. The CAD-style illustration
is decorative and does not claim measured CAD functionality.
