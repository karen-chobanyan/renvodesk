# Publishing the API and AI site notes on the VPS

First release of the Fastify API next to the static site from
[NGINX-DEPLOYMENT.md](NGINX-DEPLOYMENT.md). The API listens on
`127.0.0.1:3001` only; Nginx forwards `/api/health` and `/api/v1/` to it.
Supabase stays the database, Auth and Storage (decisions 022, 029, 030).

Order matters: **API → Nginx → web build**. A web build with AI enabled calls
`/api/v1/...`; deploy it last so it never points at a missing API.

## 0. Preconditions

- The release commit has passed CI (`.github/workflows/ci.yml`).
- Migration `20260929125009_site_note_analyses` is applied to the Supabase
  project the site uses (RenvoDesk, `oripsywzngftarbprlgk`).
- AI stays **off for every company** until an operator enables one (D4). Before
  enabling any customer company, complete the compliance track in
  decision 030: provider agreement, audio retention, consent notice and the
  privacy page's 30-day retention and processor text.

## 1. One-time server setup

Node.js 20.19 or newer is required (`node -v`). If it is missing or older,
install the current LTS from the distribution or NodeSource deliberately; do
not replace a Node used by other services without checking them.

```sh
sudo useradd --system --no-create-home --shell /usr/sbin/nologin renvodesk-api
sudo mkdir -p /opt/renvodesk-api/releases /etc/renvodesk
sudo install -m 0640 -o root -g renvodesk-api /dev/null /etc/renvodesk/api.env
sudoedit /etc/renvodesk/api.env   # contents from deploy/api.env.example
```

Type `OPENAI_API_KEY` directly on the server. Never paste it into chat, tickets,
shell history or git. Leaving it empty keeps AI unavailable while the rest of
the API runs.

Install the unit (`scp deploy/renvodesk-api.service` first). If `which node`
is not `/usr/bin/node`, edit `ExecStart` accordingly.

```sh
sudo cp ~/renvodesk-api.service /etc/systemd/system/renvodesk-api.service
sudo systemctl daemon-reload
sudo systemctl enable renvodesk-api
```

## 2. Publish an API release

On your computer, from the release commit:

```sh
pnpm install --frozen-lockfile
pnpm package:api
scp release/api.tgz ubuntu@YOUR_VPS:~/renvodesk-api.tgz
```

The archive contains `dist/`, `prompts/`, `package.json`, `REVISION` and
production `node_modules` (Fastify only) pinned by the lockfile. On the VPS:

```sh
release="/opt/renvodesk-api/releases/$(date -u +%Y%m%d%H%M%S)"
sudo mkdir -p "$release"
sudo tar -xzf ~/renvodesk-api.tgz -C "$release"
sudo chown -R root:root "$release" && sudo chmod -R a+rX,go-w "$release"
sudo ln -sfn "$release" /opt/renvodesk-api/current.next
sudo mv -Tf /opt/renvodesk-api/current.next /opt/renvodesk-api/current
sudo systemctl restart renvodesk-api
systemctl status renvodesk-api --no-pager
curl -s http://127.0.0.1:3001/api/health   # {"status":"ok"}
```

Restarting stops running AI jobs; their lease expires within five minutes and
owners see a failure they can retry. Publish outside busy hours.

## 3. Nginx

```sh
sudo cp ~/nginx-api-limits.conf /etc/nginx/conf.d/renvodesk-api-limits.conf
```

Then add the `location ^~ /api/ { … }` block from `deploy/nginx.conf` to the
**installed** site, inside the `server` block that listens on 443 (Certbot
manages it). Do not overwrite the installed file with the template: that would
remove Certbot's TLS directives. Back it up first:

```sh
sudo cp /etc/nginx/sites-available/renvodesk ~/renvodesk.nginx.bak.$(date -u +%Y%m%d%H%M%S)
sudoedit /etc/nginx/sites-available/renvodesk
sudo nginx -t && sudo systemctl reload nginx
curl -s https://renvodesk.com/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://renvodesk.com/api/v1/organizations/00000000-0000-4000-8000-000000000000/ai-status   # 401
curl -s -o /dev/null -w '%{http_code}\n' https://renvodesk.com/api/other   # 404
```

## 4. Web build

`VITE_AI_SITE_NOTES_ENABLED=true` must be set for the production build
(`.env.production.local`). Then follow NGINX-DEPLOYMENT.md steps 1 and 3:
`pnpm build:production`, upload `dist/`, switch the `current` symlink.

## 5. Verify

- Landing pages, login, a workspace deep link and a PDF preview still work.
- As an owner of a company that is **not** enabled: Documents shows no AI
  action or AI notice.
- `journalctl -u renvodesk-api --since "10 min ago"` shows only start-up lines
  and `site_note_job_*` events — no URLs, transcripts or tokens.

To try AI on your own company with a synthetic recording, enable it in the
Supabase SQL editor (use your company ID from `/workspace/<id>/…`):

```sql
insert into private.ai_site_note_entitlements (organization_id, enabled)
values ('<company id>', true)
on conflict (organization_id) do update set enabled = true;
```

Record a short fictional note, click **Transcrire avec l’IA**, and confirm
progress, the review dialog, task creation, and a free reopen on a second click.

## Rollback and kill switches

- Web: point `/var/www/renvodesk/current` back to the previous release.
- API: point `/opt/renvodesk-api/current` to the previous release and restart.
- Turn AI off for everyone immediately: empty `OPENAI_API_KEY` in
  `/etc/renvodesk/api.env` and restart — the UI hides the action.
- Turn AI off for one company: `update private.ai_site_note_entitlements set
  enabled = false where organization_id = '<company id>';`
- Nginx: restore the backup copy, `nginx -t`, reload.

The database migration is additive and unused by older builds; it does not
need rolling back.
