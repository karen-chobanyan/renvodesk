import { telemetryAvailable, telemetryConfig } from "./config";
import { CONSENT_KEY, type Consent, pageName, readConsent } from "./privacy";

type Tag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Tag;
  }
}
const events = [
  "signup_clicked",
  "demo_opened",
  "signup_request_succeeded",
  "login",
  "company_created",
  "project_created",
  "estimate_created",
  "estimate_saved",
  "task_completed",
  "expense_recorded",
  "file_uploaded",
  "sketch_published",
  "invitation_accepted",
] as const;
export type AnalyticsEvent = (typeof events)[number];
let consent: Consent | null = null;
let started = false;
let gaLoaded = false;
let lastPage = "";
let memoryOnly = false;
const sent = new Set<string>();
const listeners = new Set<() => void>();
export function getConsent() {
  return consent;
}
export function subscribeConsent(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notify() {
  for (const listener of listeners) listener();
}
function active(kind: "analytics" | "diagnostics") {
  return (
    telemetryAvailable() &&
    !!consent?.[kind] &&
    !!readConsent(JSON.stringify(consent))
  );
}
export function diagnosticsAllowed() {
  return active("diagnostics");
}
function disabled(value: boolean) {
  const key = `ga-disable-${telemetryConfig.gaId}`;
  Object.assign(window, { [key]: value });
}
function removeCookies() {
  for (const item of document.cookie.split(";")) {
    const name = item.trim().split("=")[0];
    if (!/^_ga(?:_|$)/.test(name)) continue;
    for (const domain of [
      "",
      window.location.hostname,
      `.${window.location.hostname}`,
    ]) {
      // biome-ignore lint/suspicious/noDocumentCookie: expire GA cookies in browsers without Cookie Store support
      document.cookie = `${name}=; Max-Age=0; Path=/;${domain ? ` Domain=${domain};` : ""} SameSite=Lax; Secure`;
    }
  }
}
function send(name: string) {
  if (!active("analytics") || !gaLoaded) return false;
  const page = pageName(window.location.pathname);
  window.gtag?.("event", name, {
    send_to: telemetryConfig.gaId,
    page_location: `${telemetryConfig.origin}/_analytics/${page}`,
    page_title: page,
    page_referrer: "",
    language: document.documentElement.lang === "en" ? "en" : "fr",
    app_surface:
      page === "demo"
        ? "demo"
        : page.startsWith("landing")
          ? "marketing"
          : "application",
  });
  return true;
}
export function track(event: AnalyticsEvent, deduplicationKey?: string) {
  try {
    if (!events.includes(event)) return;
    const page = pageName(window.location.pathname);
    if (page === "demo" && event !== "demo_opened") return;
    const key = deduplicationKey ? `${event}:${deduplicationKey}` : null;
    if (key && sent.has(key)) return;
    if (send(event) && key) {
      sent.add(key);
      if (sent.size > 500) sent.delete(sent.values().next().value ?? "");
    }
  } catch {
    /* Telemetry cannot interrupt the application. */
  }
}
export function trackPage(pathname = window.location.pathname) {
  try {
    const page = pageName(pathname);
    if (lastPage !== page && send("page_view")) lastPage = page;
  } catch {
    /* Optional telemetry. */
  }
}
function enableAnalytics() {
  const id = telemetryConfig.gaId;
  if (!id || !/^G-[A-Z0-9]+$/.test(id) || !active("analytics")) return;
  disabled(false);
  if (gaLoaded) {
    trackPage();
    return;
  }
  gaLoaded = true;
  window.dataLayer = window.dataLayer ?? [];
  // gtag expects an Arguments object, not a nested Array.
  window.gtag = function () {
    // biome-ignore lint/complexity/noArguments: required by the documented gtag command protocol
    window.dataLayer?.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  const page = pageName(window.location.pathname);
  window.gtag("config", id, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: `${telemetryConfig.origin}/_analytics/${page}`,
    page_title: page,
    page_referrer: "",
    cookie_domain: "none",
    cookie_expires: 60 * 60 * 24 * 180,
    cookie_update: false,
    ignore_referrer: true,
  });
  const script = document.createElement("script");
  script.id = "renvodesk-google-tag";
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
  trackPage();
}
function apply() {
  if (!telemetryAvailable()) return;
  if (active("analytics")) enableAnalytics();
  else {
    disabled(true);
    lastPage = "";
    sent.clear();
    removeCookies();
  }
  // Lazy import keeps the SDK out of the initial bundle and off the network until opt-in.
  if (active("diagnostics"))
    void import("./monitoring")
      .then((module) => module.startMonitoring())
      .catch(() => {});
}
export function saveConsent(analytics: boolean, diagnostics: boolean) {
  consent = { version: 1, analytics, diagnostics, savedAt: Date.now() };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    memoryOnly = false;
  } catch {
    memoryOnly = true;
  }
  try {
    apply();
  } catch {
    /* Keep settings usable if a provider fails. */
  }
  notify();
}
export function startTelemetry() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    consent = readConsent(localStorage.getItem(CONSENT_KEY));
  } catch {
    /* deny by default */
  }
  try {
    apply();
  } catch {
    /* Optional integrations. */
  }
  const refresh = () => {
    const previous = JSON.stringify(consent);
    if (!memoryOnly) {
      try {
        consent = readConsent(localStorage.getItem(CONSENT_KEY));
      } catch {
        consent = null;
      }
    } else if (consent && !readConsent(JSON.stringify(consent))) consent = null;
    if (previous !== JSON.stringify(consent)) {
      try {
        apply();
      } catch {
        /* Optional integrations. */
      }
      notify();
    }
  };
  window.addEventListener("storage", (event) => {
    if (!event.key || event.key === CONSENT_KEY) refresh();
  });
  window.addEventListener("focus", refresh);
  window.setInterval(refresh, 60_000);
  document.addEventListener("click", (event) => {
    if (!pageName(window.location.pathname).startsWith("landing")) return;
    const anchor =
      event.target instanceof Element ? event.target.closest("a") : null;
    if (anchor?.getAttribute("href") === "/signup") track("signup_clicked");
    if (anchor?.getAttribute("href") === "/projects") track("demo_opened");
  });
}
export function reportError(error: unknown) {
  if (!diagnosticsAllowed()) return;
  void import("./monitoring")
    .then((module) => module.reportError(error))
    .catch(() => {});
}
