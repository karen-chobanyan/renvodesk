export const telemetryConfig = {
  enabled:
    import.meta.env.PROD && import.meta.env.VITE_TELEMETRY_ENABLED === "true",
  origin: import.meta.env.VITE_PUBLIC_ORIGIN || "https://renvodesk.com",
  gaId: import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
  release: import.meta.env.VITE_RELEASE as string | undefined,
};
export function telemetryAvailable() {
  return (
    typeof window !== "undefined" &&
    telemetryConfig.enabled &&
    window.location.origin === telemetryConfig.origin
  );
}
