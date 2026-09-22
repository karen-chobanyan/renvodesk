# Public landing page

Status: implemented and locally verified; production deployment remains unconfigured.

Visual thesis: a calm architectural studio, warm paper, navy/charcoal typography,
muted sage and a large three-dimensional renovation model anchoring the hero.
Content: hero/promise + signup/demo → tangible workflow/product preview → on-site
capture and journal → concise FAQ with honest scope → final signup CTA.
Interaction: perspective house entrance, restrained pointer-driven 3D depth with a
manual exploded-view toggle, and focus/hover transitions. Respect reduced motion;
no animation library, new UI system or WebGL runtime is needed.

- [x] Build public `/` (French) and `/en` (English) outside the authenticated shell.
  Keep all workspace/demo/auth routes and their permissions intact.
- [x] Isolate the marketing entry so the landing page does not load the application,
  auth or drawing bundles. Use repository-owned CSS 3D/vector art and existing icons.
- [x] Add benefit-led, truthful FR/EN copy, working signup/demo links and accessible
  responsive navigation/FAQ. No fabricated testimonials, customer counts, prices,
  acceptance signatures or implemented invoicing claims.
- [x] Prerender both public routes using React's server renderer during Vite build.
  Provide titles/descriptions, language metadata, social previews, honest structured
  data, canonical/hreflang/sitemap using an explicit verified SITE_URL. Default
  unconfigured/staging builds to noindex; preserve a noindex app HTML shell.
- [x] Document host-independent static routing (public pages before app fallback),
  HTTPS/production URL and Search Console steps; don't choose or deploy a host.
- [x] Check current primary-source indexing guidance. Validate prerendered HTML,
  no-JavaScript content, metadata, CTAs, keyboard/mobile/FR/EN and reduced motion.
  Visually review desktop/mobile renders and run relevant regressions and build.

Verification: lint, typecheck, 45 unit tests, production build, 55 browser tests
passed (one existing intentional skip). Separate built-page Chromium checks passed
with JavaScript disabled and enabled for both preview and synthetic production
origins, including canonical/hreflang/sitemap and hydration. Desktop/mobile
screenshots were visually reviewed. No production performance score or indexing
result is claimed. The final build was restored to preview/noindex mode.
