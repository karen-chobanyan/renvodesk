# 031 — Complete fictional demo workspace

Date: 2026-10-02 · Status: accepted

## Context

The public demo covered only the project register, an older single-page project
view and one estimate editor. The live workspace has since gained project tabs,
tasks and schedule, costs, documents, sketches, the activity journal, clients,
team, settings and account screens, so the demo no longer showed the product.

## Decision

- `src/features/demo` provides a fictional counterpart for every live
  `/workspace` screen under unauthenticated routes: `/projects/:id?tab=…`,
  `/estimates`, `/estimates/:id`, `/schedule`, `/clients`, `/team`, `/settings`
  and `/account`.
- Demo screens reuse live copy, calculation/date models and CSS classes, and the
  real DXF, PDF, image and Excalidraw viewers. They never import live services.
- `DemoProvider` keeps all records in memory. Dates are relative to the viewer's
  current day so the schedule and journal always look current. Reloading resets.
- Fictional content is bilingual (`{ fr, en }`); text typed by a visitor is kept
  as entered in both languages.
- Demo assets are fictional: `public/demo/plan-rez-de-chaussee.dxf` (copy of the
  test fixture), the landing photo, and estimate PDFs generated in the browser.
- The AI voice-note review shows a prepared transcript and suggestions; no audio
  or request is sent. Uploads, camera/microphone capture, invitation delivery and
  password changes are shown but disabled with an explicit demo notice.
- The demo shell uses the same layout class as the live shell for visual parity.
- Old `/estimates/:projectId` links redirect to that project's first estimate.
- Nginx and Caddy templates allow the new SPA routes and serve `/demo/*`. The
  deployed VPS configuration must be updated separately.

## Consequences

Changing a live screen now requires updating its demo counterpart and
`tests/demo.spec.ts`. The previous demo-only "forecast margin" figure was removed
because the live product deliberately does not present a margin forecast.
