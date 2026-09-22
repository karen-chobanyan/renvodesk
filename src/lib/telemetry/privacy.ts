import type { ErrorEvent } from "@sentry/react";

export const CONSENT_KEY = "renvodesk-privacy-v1";
export const CONSENT_AGE = 180 * 24 * 60 * 60 * 1000;
export type Consent = {
  version: 1;
  analytics: boolean;
  diagnostics: boolean;
  savedAt: number;
};
export function readConsent(
  raw: string | null,
  now = Date.now(),
): Consent | null {
  try {
    const c = JSON.parse(raw ?? "null");
    return c?.version === 1 &&
      typeof c.analytics === "boolean" &&
      typeof c.diagnostics === "boolean" &&
      Number.isFinite(c.savedAt) &&
      c.savedAt <= now &&
      now - c.savedAt < CONSENT_AGE
      ? c
      : null;
  } catch {
    return null;
  }
}
// Never send identifiers, query strings, fragments, record names or auth tokens.
export function pageName(path: string): string {
  const pathname = path.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (pathname === "/") return "landing_fr";
  if (pathname === "/en") return "landing_en";
  if (/^\/(en\/)?privacy$/.test(pathname)) return "privacy";
  if (pathname === "/signup") return "signup";
  if (pathname === "/login") return "login";
  if (/^\/auth\//.test(pathname)) return "authentication";
  if (/^\/invite\//.test(pathname)) return "invitation";
  if (/^\/(projects|estimates)(\/|$)/.test(pathname)) return "demo";
  if (pathname === "/design-system") return "design_system";
  if (pathname === "/workspace") return "workspace";
  if (/^\/workspace\/[^/]+\/projects\/[^/]+\/sketches\/[^/]+$/.test(pathname))
    return "project_sketch";
  if (/^\/workspace\/[^/]+\/projects\/[^/]+\/estimates\/[^/]+$/.test(pathname))
    return "project_estimate";
  if (/^\/workspace\/[^/]+\/projects\/[^/]+$/.test(pathname)) return "project";
  const match = pathname.match(
    /^\/workspace\/[^/]+\/(team|clients|estimates|settings|schedule)$/,
  );
  return match ? `company_${match[1]}` : "not_found";
}
export function safeFrameUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    // Only static application assets, never external URLs, blob URLs or API paths.
    if (
      !/^https?:$/.test(url.protocol) ||
      !/^\/(assets|src)\/[\w./-]+\.(js|tsx?|jsx)$/.test(url.pathname)
    )
      return undefined;
    return `https://renvodesk.com${url.pathname}`;
  } catch {
    return undefined;
  }
}
export function sanitizeError(
  event: ErrorEvent,
  pathname: string,
): ErrorEvent | null {
  if (!event.exception?.values?.length) return null;
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: "javascript",
    level: "error",
    environment: "production",
    release:
      typeof event.release === "string" && /^[\w.-]{1,80}$/.test(event.release)
        ? event.release
        : undefined,
    tags: { page: pageName(pathname) },
    exception: {
      values: event.exception.values.slice(-2).map((exception) => ({
        type: [
          "Error",
          "TypeError",
          "RangeError",
          "ReferenceError",
          "SyntaxError",
        ].includes(exception.type ?? "")
          ? exception.type
          : "Error",
        value: "Application error (message removed for privacy)",
        stacktrace: {
          frames: (exception.stacktrace?.frames ?? [])
            .flatMap((frame) => {
              const filename = safeFrameUrl(frame.filename);
              return filename
                ? [
                    {
                      filename,
                      lineno: frame.lineno,
                      colno: frame.colno,
                      in_app: true,
                    },
                  ]
                : [];
            })
            .slice(-30),
        },
      })),
    },
  };
}
