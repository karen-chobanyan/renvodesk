# 017 — Explicit telemetry and Ubuntu static hosting

Selected: direct GA4 Google tag, Sentry EU project, Ubuntu VPS with Caddy and no
Docker. No GTM container, custom analytics backend or database schema is added.
Public configuration targets renvodesk.com using the user-provided IDs.

Both optional integrations require independent visitor consent. Neither loads on
local development/foreign previews or before opt-in. A browser preference lasts
180 days, supports withdrawal/cross-tab changes and never affects authentication.
GA uses explicit sanitized events; no application user/company IDs are sent.
This sacrifices raw attribution and company-level retention reporting for a narrow
initial collection scope. Data is best-effort browser telemetry, not an audit log.

Sentry initializes lazily, without default integrations except global error handlers.
The existing React boundary reports through the same gated path. Payloads are
rebuilt to omit messages, requests, users and context; static asset stack locations
remain. No replay, logs, traces, sessions or source-map uploads are enabled. The
transport checks consent again before sending and caps reports per document.

Caddy serves generated public pages and private noindex application HTML separately,
with HTTPS, canonical redirects, immutable hashed assets and genuine 404 responses.
It does not serve source maps or environment files. Supabase remains the backend.

External prerequisites are documented, not claimed complete: GA automatic enhanced
measurement must be disabled, privacy controller/contact and full notice completed,
DNS and VPS access arranged, auth redirects/email checked and live ingestion tested.
See [telemetry](../TELEMETRY.md) and [VPS deployment](../VPS-DEPLOYMENT.md).
