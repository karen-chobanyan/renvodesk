# Ubuntu VPS with Nginx — renvodesk.com

Nginx serves the compiled static application. Supabase remains the backend; no
Docker, PM2, Node server or reverse proxy to Vite is needed. Nginx is the current
preferred option; the Caddy configuration remains an alternative, not a second
server to run on the same ports.

## 1. DNS and build on your computer

Point A records for `renvodesk.com` and `www.renvodesk.com` at the VPS IP. Only use
AAAA records if the VPS IPv6 connection is configured. Allow TCP 80/443 in the VPS
firewall while preserving SSH access.

Prepare `.env.production.local` from `deploy/production.env.example`, without
overwriting existing settings. Preserve the Supabase public URL and publishable
key. Keep `VITE_TELEMETRY_ENABLED=false` until the privacy notice and GA dashboard
settings in TELEMETRY.md are complete. Production metadata requires
`SITE_URL=https://renvodesk.com`.

```sh
pnpm install --frozen-lockfile
pnpm build
```

Variables are compiled into the build. Changing a server environment file alone
does not change this static application.

## 2. Install Nginx on the VPS

```sh
sudo apt update
sudo apt install nginx rsync
sudo mkdir -p /var/www/renvodesk/releases
```

If Caddy or another web server is already listening on 80/443, arrange its
replacement first. Do not disable a service hosting other websites blindly.

## 3. Upload a release

From your computer, replace `ubuntu@YOUR_VPS_IP` with your actual SSH destination:

```sh
rsync -az --exclude='.vite/' --exclude='*.map' dist/ ubuntu@YOUR_VPS_IP:~/renvodesk-dist/
scp deploy/nginx.conf ubuntu@YOUR_VPS_IP:~/renvodesk-nginx.conf
```

On the VPS, choose a unique release directory for each deployment:

```sh
release_dir="/var/www/renvodesk/releases/$(date -u +%Y%m%d%H%M%S)"
sudo mkdir -p "$release_dir"
sudo rsync -a --exclude='.vite/' --exclude='*.map' ~/renvodesk-dist/ "$release_dir/"
# Preserve previously published lazy-loaded assets for already open browser tabs.
if [ -d /var/www/renvodesk/current/assets ]; then
  sudo cp -an /var/www/renvodesk/current/assets/. "$release_dir/assets/"
fi
sudo chmod -R a+rX "$release_dir"
sudo ln -s "$release_dir" /var/www/renvodesk/current.next
sudo mv -Tf /var/www/renvodesk/current.next /var/www/renvodesk/current
```

These symlink commands assume `current` is absent or already a symlink. If it is a
real directory, migrate it deliberately first. Retain previous releases for rollback.
Clear the staging upload directory between deployments or use a new staging path;
otherwise obsolete files can remain. Only upload built files, never `.env` or source.

## 4. Enable the site

For a new site (review/merge first if this site configuration already exists):

```sh
sudo cp ~/renvodesk-nginx.conf /etc/nginx/sites-available/renvodesk
sudo ln -s /etc/nginx/sites-available/renvodesk /etc/nginx/sites-enabled/renvodesk
sudo nginx -t
sudo systemctl reload nginx
```

The supplied configuration serves the French/English landing and privacy pages,
uses `app.html` only for recognized application routes, sets private pages noindex
and returns real 404s. Do not replace this with a global `/index.html` SPA fallback.
Access logging is disabled to avoid storing auth callback codes; review error-log
retention/access separately. Hashed assets receive a long cache lifetime.

## 5. Enable HTTPS

Following the [official Ubuntu/Certbot guidance](https://ubuntu.com/server/docs/how-to/security/obtain-tls-certificates/),
install the snap package if Certbot is not already installed:

```sh
sudo apt install snapd
sudo snap install --classic certbot
sudo /snap/bin/certbot --nginx --redirect -d renvodesk.com -d www.renvodesk.com
sudo nginx -t
sudo systemctl reload nginx
sudo /snap/bin/certbot renew --dry-run
```

Both domains must resolve to this VPS for certificate validation. Certbot modifies
the enabled site configuration to add TLS and redirects; preserve those changes on
future deployments rather than overwriting the server config with the HTTP template.
If Certbot is already installed through another method, use that installation
instead of installing a second one.

## 6. Verify before launch

- Open https://renvodesk.com and https://renvodesk.com/en/.
- Reload a workspace deep link; it must load the app, not the landing page.
- Confirm `/missing-page` and `/assets/missing.js` return HTTP 404.
- Verify privacy pages, signup, login, files and camera/microphone over HTTPS.
- Configure Supabase production auth redirects from docs/SUPABASE.md and test email
  confirmation/recovery delivery.
- Complete docs/TELEMETRY.md before enabling analytics, then rebuild/redeploy.
- Confirm TLS renewal and establish server patching/backups/uptime monitoring.

This configuration has not been installed on your VPS. Run `nginx -t` on the actual
server before reloading; installed Nginx modules and existing sites can differ.

Reference: [Nginx static files and try_files](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/).

## Troubleshooting: HTML loads but assets return 404

Check a URL actually referenced by the published HTML, then check the same filename
on disk. All these directories must be siblings under the configured root:

```
/var/www/renvodesk/current/index.html
/var/www/renvodesk/current/app.html
/var/www/renvodesk/current/assets/
/var/www/renvodesk/current/images/
/var/www/renvodesk/current/fonts/
/var/www/renvodesk/current/excalidraw/
```

Do not upload only index.html, nest everything under current/dist/, or combine HTML
from one build with assets from a different build. To inspect the VPS:

```sh
readlink -f /var/www/renvodesk/current
sudo ls -ld /var/www/renvodesk/current /var/www/renvodesk/current/assets /var/www/renvodesk/current/images
sudo find -L /var/www/renvodesk/current -maxdepth 2 -name 'index-*.js'
sudo nginx -T 2>&1 | grep -E 'server_name|root |alias |location .*assets'
```

Check the HTTPS server block's root too: it must point to the same release. If files
exist but return 404, use `namei -l` on the failing absolute file path and verify the
Nginx worker user can traverse every parent directory and read the file. Do not use
chmod 777. Upload a complete release using step 3, validate Nginx and reload only
if configuration changes. Preserve Certbot's TLS directives.
