# Ubuntu VPS deployment — renvodesk.com

For the requested Nginx setup, use [the Nginx guide](NGINX-DEPLOYMENT.md) and
`deploy/nginx.conf`. The Caddy instructions below remain an alternative.

Target: Ubuntu with Caddy as a systemd service, no Docker. Only compiled static
files are served; no Node production server is required. Supabase remains the
backend. No VPS connection, DNS change or production deployment has been performed.

## Prepare the build

Use a supported Node version satisfying package.json and pnpm 10.23.0. On the build
machine, copy `deploy/production.env.example` to `.env.production.local` if that file
does not already exist. Preserve existing environment values. Fill in the operator
name and privacy email; keep the browser-safe Supabase URL and publishable key from
your existing configuration. Do not put privileged keys in VITE variables.

```
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build:production
pnpm test:e2e --config playwright.telemetry.config.ts --workers=2
```

`SITE_URL=https://renvodesk.com` generates production metadata. Telemetry is enabled
only on the exact production origin and only after visitor consent. Build variables
are compiled into JavaScript; editing a VPS environment file after building does
not change the application. Rebuild when configuration changes. Keep telemetry
false until the dashboard settings and privacy notice in TELEMETRY.md are ready.

## Provision and serve

1. Point apex and www DNS records at the VPS. Remove conflicting/stale IPv6 records
   unless IPv6 is configured. Preserve SSH access; allow inbound TCP 80 and 443.
2. Install Caddy using its [official Ubuntu package instructions](https://caddyserver.com/docs/install#debian-ubuntu-raspbian).
   This provides the systemd service and automatic HTTPS. Do not run the Vite dev
   server publicly. Review existing services before binding ports 80/443.
3. Upload only `dist/` contents to a new directory under
   `/var/www/renvodesk/releases/`, readable by the `caddy` service account. Do not
   upload `.env` files, source code, node_modules or `.vite/manifest.json`.
4. Make `/var/www/renvodesk/current` point at that release. Retain the preceding
   release for rollback, and retain old hashed assets across releases so already
   open tabs can still load lazy chunks. Use an atomic symlink switch on Ubuntu;
   never replace files in a currently served release in place.
5. Review `deploy/Caddyfile` and install it as `/etc/caddy/Caddyfile` (merge with
   existing site configuration if the VPS serves other sites). Validate then reload:

```
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy
```

The configuration serves FR/EN public HTML first, canonicalizes www and locale
paths, serves noindex application shells only for recognized routes and returns
real 404s for unknown paths. It denies direct access to env files, maps, build
manifests and the app shell. Hashed assets are immutable; other files revalidate.
No access log storing auth callback query strings is configured. Add any operational
logging deliberately with URL/token scrubbing and retention limits.

## Pre-launch checks

- Finish operator/contact details and dashboard settings from TELEMETRY.md.
- Configure Supabase production Site URL and exact auth callback/recovery redirects
  per docs/SUPABASE.md. Test actual signup confirmation and recovery email delivery.
- Check `/`, `/en/`, privacy pages, login, workspace deep links and invitation links.
  Verify unknown URLs return 404 and private HTML carries noindex.
- Confirm camera/microphone capture over HTTPS and saved work round trips.
- Check GA Realtime and a controlled Sentry report only after opt-in; then test reject.
- Submit `/sitemap.xml` in Search Console after verifying domain ownership.
- Arrange VPS patching, backups, resource/uptime monitoring and restore procedures.
  Supabase database and Storage backups remain separate from static VPS files.

To check the routing locally with a Caddy binary and a completed build:

```
CADDY_BIN=caddy node scripts/check-vps-routing.mjs
```

This runs a temporary HTTP-only server on 127.0.0.1:4187. It tests public/static
routes, privacy redirects, noindex application shells and missing-file 404s, without
requesting certificates or touching production.
