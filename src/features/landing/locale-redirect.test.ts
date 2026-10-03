import { afterEach, describe, expect, it, vi } from "vitest";
import {
  localeRedirectScript,
  preferredLandingLocale,
  redirectToPreferredLandingLocale,
} from "./locale-redirect";

describe("preferredLandingLocale", () => {
  it("honours an explicit choice over every other signal", () => {
    expect(preferredLandingLocale("en", ["fr-BE"], "Europe/Paris")).toBe("en");
    expect(preferredLandingLocale("fr", ["en-GB"], "Europe/London")).toBe("fr");
  });

  it("uses the first French or English browser language", () => {
    expect(preferredLandingLocale(null, ["en-US", "fr"], "Europe/Paris")).toBe(
      "en",
    );
    expect(preferredLandingLocale(null, ["nl-BE", "FR-be", "en"], "")).toBe(
      "fr",
    );
    expect(preferredLandingLocale("de", ["fr"], undefined)).toBe("fr");
  });

  it("falls back to the time zone, then English", () => {
    expect(preferredLandingLocale(null, ["de-DE"], "Europe/Paris")).toBe("fr");
    expect(preferredLandingLocale(null, [], "Europe/Luxembourg")).toBe("fr");
    // Brussels is bilingual; a Dutch-only browser reads English better than French.
    expect(preferredLandingLocale(null, ["nl-BE"], "Europe/Brussels")).toBe(
      "en",
    );
    expect(preferredLandingLocale(null, ["es"], "America/New_York")).toBe("en");
  });
});

type Environment = {
  pathname?: string;
  languages?: string[];
  userAgent?: string;
  webdriver?: boolean;
  session?: Record<string, string>;
  local?: Record<string, string>;
  timeZone?: string;
};

function stubBrowser({
  pathname = "/",
  languages = ["en-GB"],
  userAgent = "Mozilla/5.0 Chrome/130.0",
  webdriver = false,
  session = {},
  local = {},
  timeZone = "Europe/London",
}: Environment) {
  const replace = vi.fn();
  const storage = (values: Record<string, string>) => ({
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => {
      values[key] = value;
    },
  });
  vi.stubGlobal("location", {
    pathname,
    search: "?a=1",
    hash: "#faq",
    replace,
  });
  vi.stubGlobal("navigator", {
    languages,
    language: languages[0],
    userAgent,
    webdriver,
  });
  vi.stubGlobal("sessionStorage", storage(session));
  vi.stubGlobal("localStorage", storage(local));
  vi.stubGlobal("Intl", {
    DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone }) }),
  });
  return { replace, session };
}

describe("redirectToPreferredLandingLocale", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("redirects a first entry and keeps the query and hash", () => {
    const { replace, session } = stubBrowser({});
    expect(redirectToPreferredLandingLocale(preferredLandingLocale)).toBe(true);
    expect(replace).toHaveBeenCalledWith("/en/?a=1#faq");
    expect(session["renvodesk-landing-entry"]).toBe("1");
  });

  it("redirects English pages to French for French browsers", () => {
    const { replace } = stubBrowser({ pathname: "/en", languages: ["fr-FR"] });
    expect(redirectToPreferredLandingLocale(preferredLandingLocale)).toBe(true);
    expect(replace).toHaveBeenCalledWith("/?a=1#faq");
  });

  it("stays when the page already matches", () => {
    const { replace } = stubBrowser({ languages: ["fr-BE"] });
    expect(redirectToPreferredLandingLocale(preferredLandingLocale)).toBe(
      false,
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("never redirects after the first landing page in a tab", () => {
    const { replace } = stubBrowser({
      session: { "renvodesk-landing-entry": "1" },
    });
    expect(redirectToPreferredLandingLocale(preferredLandingLocale)).toBe(
      false,
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("follows a manual language choice but ignores automatic ones", () => {
    const manual = stubBrowser({
      pathname: "/en/",
      local: {
        "renvodesk-locale": "fr",
        "renvodesk-locale-source": "manual",
      },
    });
    redirectToPreferredLandingLocale(preferredLandingLocale);
    expect(manual.replace).toHaveBeenCalledWith("/?a=1#faq");
    vi.unstubAllGlobals();
    const automatic = stubBrowser({
      pathname: "/en/",
      local: { "renvodesk-locale": "fr" },
    });
    redirectToPreferredLandingLocale(preferredLandingLocale);
    expect(automatic.replace).not.toHaveBeenCalled();
  });

  it("leaves crawlers, automation and other pages alone", () => {
    for (const environment of [
      { userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      { webdriver: true },
      { pathname: "/privacy/" },
      { pathname: "/login" },
    ]) {
      const { replace } = stubBrowser(environment);
      expect(redirectToPreferredLandingLocale(preferredLandingLocale)).toBe(
        false,
      );
      expect(replace).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    }
  });

  it("does nothing when storage is blocked", () => {
    const { replace } = stubBrowser({});
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(redirectToPreferredLandingLocale(preferredLandingLocale)).toBe(
      false,
    );
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("localeRedirectScript", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("serializes a self-contained classic script", () => {
    const script = localeRedirectScript();
    expect(script).toMatch(/^<script>.*<\/script>$/s);
    const { replace } = stubBrowser({});
    new Function(script.replace(/^<script>|<\/script>$/g, ""))();
    expect(replace).toHaveBeenCalledWith("/en/?a=1#faq");
  });
});
