# Launch telemetry and Ubuntu VPS deployment

- [x] Add production-only GA4 and Sentry configuration for the provided domain/IDs.
- [x] Add FR/EN analytics and diagnostic consent controls, disabled until opted in,
  persisted with expiry and available from every route. No replay, advertising,
  automatic DOM capture, full URLs or user/customer content.
- [x] Send explicit sanitized page views and successful workflow milestones; demo
  actions remain separate. Analytics must never block business operations.
- [x] Add sanitized error reporting and React boundary integration with no PII,
  breadcrumbs, request bodies, replay or performance tracing.
- [x] Prepare Ubuntu/Caddy static deployment, canonical routing, private noindex
  app fallback, real 404s and build-time configuration. Do not deploy remotely.
- [x] Test consent lifecycle, no requests before consent, navigation sanitization,
  event success/failure, monitoring filtering, build and app regressions.

Privacy notice cannot be finalized until the operator's legal name and privacy
contact are provided. No dashboard access or VPS access has been provided.

Verification: lint/typecheck and 52 unit tests passed. Production build passed;
55 application browser tests passed with one existing skip. Ten dedicated desktop/
mobile telemetry tests passed against intercepted providers, covering consent,
withdrawal, cross-tab updates, storage denial and sanitized Sentry envelopes.
Caddy configuration validation and live localhost routing checks passed, as did
built landing no-JavaScript/hydration checks. Consent screenshots were visually
reviewed on desktop/mobile. Existing drawing-bundle size warnings remain.

Not deployed. GA dashboard Enhanced measurement settings, live provider delivery,
operator identity/privacy email, full service privacy notice and VPS/DNS setup are
external launch prerequisites, documented in TELEMETRY.md and VPS-DEPLOYMENT.md.
