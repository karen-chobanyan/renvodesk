# 016 — Public landing page and static indexing

The public root is now a French marketing page; `/en/` is its English counterpart.
The workspace remains at `/workspace`. Public entry code is separate from the
application entry, so visiting the landing page does not initialize Supabase auth
or download the drawing editor. Native links cross this boundary and retain the
chosen language for signup, login and the fictional demo.

The page uses existing Inter, navy and sage branding, actual application screenshots,
an illustrative kitchen walkthrough and a generated architectural interior image.
No WebGL or animation dependency was added. Reduced motion disables entrance, tilt
and animated transitions. Product
copy reflects implemented capabilities and labels fictional data explicitly. The
hero identifies renovation contractors and the estimate-to-cost workflow directly.
Four localized screenshots show the project overview, estimate editor, tasks and
cost budget.

Update 2026-09-29: the decorative axonometric drawing was replaced by a kitchen
walkthrough (`landing-case.tsx`). Keyboard-accessible stage tabs switch an
illustrative project file between estimate lines, trade tasks and costs against
budget. Its data is fictional and labelled as such; amounts are integer cents
excluding tax, and totals are derived rather than typed. It must stay consistent
with implemented behaviour (recorded client answers, not signatures; budget
remaining is not profit). Only the first stage is visible without JavaScript.

A dark blueprint section (`landing-plans.tsx`) shows a hand-authored SVG ground
floor of the same fictional kitchen in a viewer frame with layer toggles and a
cursor readout, and the hero carries a faint drafting grid. The drawing is
decorative: its captions state that RenvoDesk previews DXF files read-only,
without editing or takeoff, and its copy only names implemented DXF preview and
sketch revision features.

The build prerenders both locales with React's server renderer, then hydrates
their controls. Primary content and native FAQ disclosures work without JavaScript.
Production canonical URLs, reciprocal language alternates, social metadata,
SoftwareApplication structured data and a two-page sitemap use explicit `SITE_URL`.
An unset origin produces noindex preview pages and no sitemap. The application
shell remains noindex. No domain ownership, hosting, indexing or ranking is implied.

Deployment must serve the two public HTML files before applying the application
fallback; see [publishing instructions](../LANDING-PUBLISHING.md).
