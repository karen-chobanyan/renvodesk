# 016 — Public landing page and static indexing

The public root is now a French marketing page; `/en/` is its English counterpart.
The workspace remains at `/workspace`. Public entry code is separate from the
application entry, so visiting the landing page does not initialize Supabase auth
or download the drawing editor. Native links cross this boundary and retain the
chosen language for signup, login and the fictional demo.

The page uses existing Inter, navy and sage branding, a CAD-style axonometric illustration
with an accessible exploded-layer button, actual application screenshots and a
generated architectural interior image. No WebGL or animation dependency was
added. Reduced motion disables entrance, tilt and animated transitions. Product
copy reflects implemented capabilities and labels fictional data explicitly. The
hero identifies renovation contractors and the estimate-to-cost workflow directly.
Four localized screenshots show the project overview, estimate editor, tasks and
cost budget. The drawing is decorative, not a measured CAD feature.

The build prerenders both locales with React's server renderer, then hydrates
their controls. Primary content and native FAQ disclosures work without JavaScript.
Production canonical URLs, reciprocal language alternates, social metadata,
SoftwareApplication structured data and a two-page sitemap use explicit `SITE_URL`.
An unset origin produces noindex preview pages and no sitemap. The application
shell remains noindex. No domain ownership, hosting, indexing or ranking is implied.

Deployment must serve the two public HTML files before applying the application
fallback; see [publishing instructions](../LANDING-PUBLISHING.md).
