# Landing language redirect

Goal: a visitor entering `/` or `/en/` from outside the site lands on the language
their browser prefers, without breaking explicit choices, crawlers or JS-off pages.

- [x] Pure chooser: explicit manual choice → first `fr`/`en` in `navigator.languages`
      → time-zone hint (France, Monaco, Luxembourg → French) → English.
- [x] Runner: only on `/` and `/en/`; once per tab (sessionStorage entry flag, so
      in-site navigation and the language switch never bounce); skip automation and
      crawlers; `location.replace` keeping query/hash; fail closed on storage errors.
- [x] Inline the runner in the prerendered `<head>` before stylesheets (no flash);
      the landing entry calls it too for `pnpm dev`.
- [x] Language switch clicks store `renvodesk-locale` with source `manual`.
- [x] Document the session flag in both privacy notices.
- [x] Unit tests for the chooser/serialized script; Playwright redirect tests.
- [x] Docs: LANDING-PUBLISHING.md, decision 032, AGENTS.md.

Not done: IP geolocation (needs a server GeoIP database/licence and is a weaker
signal than browser language). Dutch remains deferred, so Dutch browsers get English.
