# GA4 production activation

Live diagnosis on 24 September 2026: the deployed entry bundle at `renvodesk.com` has its analytics sender compiled to a constant `false` and contains no GA measurement ID. The RenvoDesk GA4 web stream reports no data in the past 48 hours. The measurement ID is `G-Y94L907Y9E`, matching the documented configuration. Enhanced measurement is currently on; it must be disabled before activating the application's explicit, sanitized events. Event and user retention are both two months, with activity reset off.

1. Add a guarded production build command that checks the production origin, public site URL, telemetry flag, and GA measurement ID before Vite compiles them. Keep ordinary `pnpm build` available for noindex previews.
2. Prepare an ignored `.env.production.local` for a GA-only production build using the confirmed stream ID. Build and run the GA consent browser tests against the resulting static files. Leave the Sentry DSN unset for this activation.
3. Review the generated bundle for the configured ID and active sender. Update deployment instructions to use the guarded command when analytics is intended.
4. Turn off Enhanced measurement in the RenvoDesk GA4 web stream, then deploy the verified `dist/` as a separate step. Opt in on the live site and inspect GA4 Realtime. Do not treat a local test or build as proof that the dashboard receives events.
