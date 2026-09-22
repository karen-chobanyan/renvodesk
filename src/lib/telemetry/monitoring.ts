import * as Sentry from "@sentry/react";
import { telemetryConfig } from "./config";
import { sanitizeError } from "./privacy";
import { diagnosticsAllowed } from "./runtime";

let initialized = false;
let count = 0;
export function startMonitoring() {
  if (initialized || !diagnosticsAllowed() || !telemetryConfig.sentryDsn)
    return;
  initialized = true;
  Sentry.init({
    dsn: telemetryConfig.sentryDsn,
    environment: "production",
    release: telemetryConfig.release,
    sendDefaultPii: false,
    defaultIntegrations: false,
    integrations: [Sentry.globalHandlersIntegration()],
    sendClientReports: false,
    enableLogs: false,
    beforeSend(event) {
      if (!diagnosticsAllowed() || count >= 20) return null;
      const safe = sanitizeError(event, window.location.pathname);
      if (safe) count++;
      return safe;
    },
    transport(options) {
      const transport = Sentry.makeFetchTransport(options);
      return {
        ...transport,
        send(envelope) {
          // Check consent again at the transport boundary, including asynchronous processing.
          if (!diagnosticsAllowed()) return Promise.resolve({});
          return transport.send(envelope);
        },
      };
    },
  });
}
export function reportError(error: unknown) {
  if (!diagnosticsAllowed()) return;
  startMonitoring();
  if (initialized) Sentry.captureException(error);
}
