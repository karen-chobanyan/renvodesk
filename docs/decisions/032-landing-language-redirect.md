# 032 — Landing language redirect

Date: 2026-10-03 · Status: accepted

## Context

French at `/` and English at `/en/` were only chosen by the URL a visitor
followed. English-speaking visitors typing the domain saw French first.

## Decision

- An inline classic script in the prerendered `<head>` of `/` and `/en/` runs
  before stylesheets and module scripts, so the wrong language never paints.
  `src/features/landing/locale-redirect.ts` is the single source; the prerender
  serializes it with `Function.prototype.toString`, and the landing entry calls it
  again for `pnpm dev`. Its functions must stay self-contained.
- Order of signals: an explicit choice (`renvodesk-locale` with source `manual`,
  written by the landing language switch or the app's account language), then the
  first French or English tag in `navigator.languages`, then the browser time zone
  as a coarse location hint (Paris, Monaco, Luxembourg → French), otherwise English.
  Brussels is bilingual and does not override a Dutch browser. Dutch is deferred.
- It acts once per tab. `renvodesk-landing-entry` (session storage) is set on the
  first landing page, so in-site navigation and the language switch (even before
  hydration) are never bounced. Blocked storage disables the redirect.
- `location.replace` keeps query and hash and does not add a history entry.
- Crawlers (bot/crawl/spider user agents, Lighthouse, headless) and automation
  (`navigator.webdriver`) are not redirected, so both pages stay indexable;
  hreflang alternates are unchanged. Legal pages are never redirected.

## Not chosen

IP geolocation needs a server GeoIP database and licence, sends more personal
data through the request path, and is a weaker language signal than the browser's
own setting (Belgium and the Netherlands are multilingual). A server
`Accept-Language` redirect would need `Vary` handling on static HTML and would
redirect crawlers.

## Verification

`locale-redirect.test.ts`, `tests/landing-language.spec.ts` and the redirect
section of `scripts/check-landing-build.mjs`. Real browsers and Search Console
crawling after deployment remain unverified.
