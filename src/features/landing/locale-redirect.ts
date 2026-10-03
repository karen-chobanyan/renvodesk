import type { LandingLocale } from "./landing-copy";

/*
 * Both functions are serialized into the prerendered <head> with
 * Function.prototype.toString, so they must reference only their parameters and
 * browser globals: no imports, module constants or helper functions.
 */

/** Explicit choice, then browser languages, then a coarse time-zone hint. */
export function preferredLandingLocale(
  choice: string | null,
  languages: readonly string[],
  timeZone: string | undefined,
): LandingLocale {
  if (choice === "fr" || choice === "en") return choice;
  for (const tag of languages) {
    const language = tag.toLowerCase().split("-")[0];
    if (language === "fr" || language === "en") return language;
  }
  // Neither language is listed: a French-speaking time zone suggests French.
  // Brussels is bilingual, so it does not override a Dutch browser.
  const french = ["Europe/Paris", "Europe/Monaco", "Europe/Luxembourg"];
  return french.indexOf(timeZone ?? "") >= 0 ? "fr" : "en";
}

/**
 * Sends a visitor entering `/` or `/en/` to their preferred language once per
 * tab. Later landing pages in the same tab (including the language switch) are
 * never redirected. Returns true when navigation has started.
 */
export function redirectToPreferredLandingLocale(
  choose: typeof preferredLandingLocale,
): boolean {
  try {
    const path = location.pathname;
    const current = path === "/" ? "fr" : /^\/en\/?$/.test(path) ? "en" : null;
    if (!current) return false;
    if (
      navigator.webdriver ||
      /bot|crawl|spider|slurp|facebookexternalhit|lighthouse|headless/i.test(
        navigator.userAgent,
      )
    )
      return false;
    if (sessionStorage.getItem("renvodesk-landing-entry")) return false;
    sessionStorage.setItem("renvodesk-landing-entry", "1");
    const choice =
      localStorage.getItem("renvodesk-locale-source") === "manual"
        ? localStorage.getItem("renvodesk-locale")
        : null;
    const target = choose(
      choice,
      navigator.languages?.length ? navigator.languages : [navigator.language],
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    if (target === current) return false;
    location.replace(
      (target === "fr" ? "/" : "/en/") + location.search + location.hash,
    );
    return true;
  } catch {
    // Blocked storage or missing APIs: keep the requested page.
    return false;
  }
}

/** Inline classic script for the prerendered head, placed before stylesheets. */
export function localeRedirectScript() {
  const source = `(${redirectToPreferredLandingLocale.toString()})(${preferredLandingLocale.toString()});`;
  if (/<\/|<!--/.test(source))
    throw new Error("Locale redirect script cannot be inlined safely");
  return `<script>${source}</script>`;
}

/** Records a deliberate language switch so later visits keep it. */
export function rememberLandingLocale(locale: LandingLocale) {
  try {
    localStorage.setItem("renvodesk-locale", locale);
    localStorage.setItem("renvodesk-locale-source", "manual");
  } catch {
    /* Storage is optional for a public page. */
  }
}
