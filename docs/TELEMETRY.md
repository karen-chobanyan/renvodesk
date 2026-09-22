# Analytics and error monitoring

Configured providers: GA4 `G-Y94L907Y9E` and the supplied German-region Sentry DSN.
Public build values are in `deploy/production.env.example`; they are not passwords.
No provider dashboards have been changed and live delivery has not been verified.

## Activation and consent

Collection requires all three: a production build, `VITE_TELEMETRY_ENABLED=true`,
and an exact match with `VITE_PUBLIC_ORIGIN`. Local dev and foreign preview hosts
never initialize providers. Both analytics and diagnostics additionally require
separate explicit opt-in. Reject and accept have equal prominence; privacy settings
remain accessible on every route. Preference version 1 expires after 180 days;
storage failures fall back to the current document's memory. Another tab's changes
are observed, and expiry is rechecked during long sessions.

There are no pre-consent provider requests, replay, advertising signals, persistent
application user IDs, company IDs, DOM capture or performance tracing. GA uses its
own consented browser cookies. Preference storage is separate from login storage;
rejecting tracking does not disable authentication or the project journal.
Withdrawal blocks future collection and removes our GA cookies; it cannot recall
requests already sent. No automatic reload discards unsaved application work.

## Event contract

| Event | Trigger |
| --- | --- |
| page_view | Generic route category changes, after consent; no IDs/query/hash/title |
| signup_clicked / demo_opened | Landing-page link click |
| signup_request_succeeded | Auth API accepts signup request; **not proof of email verification or new account** |
| login | Successful password login |
| company_created / project_created | Successful write or recovered request |
| estimate_created / estimate_saved | Successful creation or revision save |
| task_completed | Saved transition from another status to done |
| expense_recorded | Successful new cost entry or recovered create |
| file_uploaded | Metadata successfully finalized as ready |
| sketch_published | Successful publication RPC |
| invitation_accepted | Successful explicit acceptance RPC |

Only event names, safe page category, FR/EN language and marketing/application/demo
surface are sent as application properties. Request IDs are used only in a bounded
in-memory deduplication set, never sent. Reloads can repeat recovered operations;
these are browser analytics, not authoritative transaction counts. The journal is
the source of business history. Demo edits never emit real-workspace milestones.
Anonymous pre-consent activity is discarded, not replayed after acceptance.

There is no verified-signup event or company-retention dashboard in this first
integration. GA reports consenting browsers, not unique companies. Raw referrers
and campaign URLs are deliberately omitted; attribution will be limited. Add
allowlisted attribution only after a separate privacy review.

## Required dashboard settings before enabling production collection

GA4 → Admin → Data streams → this Web stream:
- Disable **all Enhanced measurement**, including browser-history page views, form
  interactions, outbound clicks, downloads, site search and video. The application
  owns sanitized explicit page views. Leaving automatic measurement enabled can
  duplicate events and capture full URLs/link metadata.
- Keep Google Signals, user-provided data collection, advertising personalization
  and Ads linking disabled. Do not add other tags through the Google tag UI.
- Select an appropriate event-data retention period (start with two months),
  configure internal-traffic exclusions and review the data-processing terms.
- Mark meaningful events such as project_created as key events. Do not treat
  signup_request_succeeded as verified signup. Build a funnel from signup request
  to company_created to project_created, then estimate_saved.

Sentry:
- Enable server-side data scrubbing and review IP handling/retention and terms.
- Set error volume limits and alert rules for new/regressed production issues.
- Replay, browser sessions, breadcrumbs, logs and tracing integrations are not
  installed. Unhandled errors and the React error boundary are reported after
  diagnostic consent. Handled API failures are not comprehensively instrumented.
- Error payloads are rebuilt from an allowlist: generic exception type, static
  application asset paths, line/column, generic page category and optional release.
  Messages, extra data, user, request, contexts and source text are discarded.
  Reports are capped at twenty per document. Providers still receive network
  metadata when a request reaches them; this is not a claim of anonymity.
- Source maps are not uploaded or served. To add private source maps later, use a
  server/CI secret token and hidden maps, upload them, then omit them from deployment.
  No auth token belongs in a VITE variable. Current reports reference minified assets.

## Privacy notice and launch prerequisites

`/privacy/` and `/en/privacy/` contain a factual tracking explanation. They are
prerendered and noindex. Set `VITE_PRIVACY_OPERATOR` and `VITE_PRIVACY_EMAIL` and
complete the service-wide notice before launch (operator details, purposes/legal
bases, processors, transfers, retention and rights). The explanatory page explicitly
states when those details are missing; it is not a completed legal policy.

## Verification

```
pnpm lint
pnpm typecheck
pnpm test
# First build with deploy/production.env.example values in the environment:
pnpm test:e2e --config playwright.telemetry.config.ts --workers=2
```

The dedicated browser suite serves `dist` on a mocked renvodesk.com origin and
intercepts **all** network traffic. It proves consent gating, withdrawal, FR/EN,
expired choices and sanitized Sentry envelopes without polluting either provider.
It does not verify real dashboard ingestion. After deploying, consent in a test
browser, confirm GA Realtime and one controlled Sentry exception, then withdraw
consent and verify no further collection. Never include real customer data in tests.

Sources: [Google basic consent mode](https://developers.google.com/tag-platform/security/concepts/consent-mode),
[Google consent implementation](https://developers.google.com/tag-platform/security/guides/consent),
[Enhanced measurement](https://support.google.com/analytics/answer/9216061),
[Sentry options](https://docs.sentry.io/platforms/javascript/configuration/options/).
