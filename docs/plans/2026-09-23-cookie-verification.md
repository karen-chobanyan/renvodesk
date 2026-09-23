# Cookie notice verification

- Inspect deployed consent UI and pre-consent tracking in a fresh browser.
- Add FR/EN storage inventory and operator identification to the consent notice.
- Run production-build consent tests with external providers intercepted.
- Report live findings separately from local verification; no deployment implied.

## Results

- Live https://renvodesk.com/en/ opened in a fresh Chromium context. No consent
  panel, Google/Sentry requests or cookies were observed. A second load showed
  no failed HTTP assets or page errors. This does not verify acceptance or
  withdrawal on the live site: no panel was available to operate. Disabled or
  older deployed telemetry remains a possibility, not a confirmed diagnosis.
- Added FR/EN inventory of consent, language, auth/PKCE storage and GA cookies;
  distinguished validity from physical browser deletion and provider retention.
  Sentry integration does not intentionally set a persistent identifier.
- Notice explains how to withdraw and links directly to the inventory. Operator
  and provider names remain in the privacy policy rather than the compact notice.
  No changes to consent gating or collection.
- Lint and production build passed. All 10 consent tests passed on desktop/mobile
  with external network calls intercepted. These verify refusal, persistence,
  expiry, selective opt-in, sanitization, withdrawal and cross-tab withdrawal.
- Production-enabled dist is built locally. No upload or server changes made.
  Rebuild with deploy/production.env.example settings and upload the complete
  dist tree to deploy this behaviour; then repeat live consent checks.

## Consent control availability

- Render consent controls after hydration independently of telemetry configuration.
- Show the panel when no valid saved choice exists, including local/private browsing.
- Keep production/origin checks in the telemetry runtime; displaying controls must
  not enable provider requests in development or on an unconfigured origin.
- Verify fresh browsing, refusal persistence, reopening and repeated trigger clicks.
