# Terms of Use and Privacy Policy

- [x] Write complete FR/EN working drafts covering the actual product, data flows,
  consent, roles, retention criteria and individual rights. Do not invent operator
  identity, a governing jurisdiction, pricing, deletion SLAs or verified contracts.
- [x] Add a shared readable legal layout, table of contents, dates, locale switch,
  cross-links and both landing footer links. Show missing operator details clearly.
- [x] Prerender /terms/, /en/terms/, /privacy/, /en/privacy/ and support the routes in
  development, bootstrap, telemetry classification, Nginx and Caddy.
- [x] Verify both languages, mobile/keyboard navigation, static HTML and build.

Primary sources: European Commission GDPR obligations/principles and EDPB guidance
on controller/processor roles, individual rights and international transfers.
Operator name, country, address and contact have been requested. Subprocessor,
retention and transfer arrangements need operator verification before publication.

Verification: lint, TypeScript, 52 unit tests, and 10 desktop/mobile landing and
legal browser checks passed. Static HTML/hydration and Caddy routing checks passed.
Nginx is not installed locally; validate the actual VPS config with nginx -t.
Operator details and operational legal review remain pending; no deployment made.
