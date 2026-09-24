# 019 — Private project DXF previews

Decision 020 replaces the iframe runtime described below with a direct React
component. Decision 021 retires the separate prototype and moves rendering
coverage into the project viewer tests. File policies, private downloads and
fidelity limits remain.

The user approved connecting the evaluated viewer to Project → Documents.
Owners can upload/delete DXF attachments; members can view/download them. This
extends the existing file domain rather than creating a second drawing editor.
Excalidraw remains the editable project sketch tool.

## Implementation

- Canonical MIME `application/dxf` added to the metadata constraint and private
  bucket. Common OS DXF aliases normalize only for the `.dxf` extension. The
  10 MiB limit, reservation/finalization, immutable paths, permissions and RLS
  remain unchanged. Unsupported types such as DWG are not added.
- Development migration `20260923122228_project_dxf_files` is applied to
  `oripsywzngftarbprlgk`. Local history matches remote. Database types were
  regenerated; this constraint-only change produces no type diff.
- A lazy preview downloads through the one-hour signed URL, without
  passing the URL to the frame. Response bytes are capped at 10 MiB independent
  of metadata/Content-Length. Close aborts download and removes the frame.
  The host shows loading failure after 30 seconds. Loaded drawings remain open
  until closed; signed URL expiry does not invalidate in-memory content. Reopening
  obtains a new signed URL. Nothing is autosaved. This corrects the initially
  inherited 55-second preview timer, which unnecessarily closed loaded DXF plans.
- Shared `src/features/cad` canvas opens the document in read mode. Controls are
  fit, zoom, pan and layer visibility. No editing commands, export UI, DWG parser,
  automatic quantities or prices. Only model space, with local Noto Sans fonts.
- `cad-canvas.html` now ships with the application. The prototype remains a
  separate build. Nginx/Caddy configs permit same-origin framing only for that
  entry. CAD runtime helpers have a separate chunk so React and the landing do
  not import the engine. Prerendering rejects a static landing CAD dependency.

## Verification and limitations

- Lint, TypeScript, all 53 unit tests and application build pass. Six DXF
  integration cases, six built CAD rendering cases and six landing cases pass.
- `tests/project-dxf.spec.ts`: owner upload, canonical MIME, no upsert, reopen
  after reload, controls, keyboard layers, original download/deletion; member
  read-only UI; malformed/oversized/failed downloads, continued viewing after URL
  expiry without refetching, French controls and
  close during download. Runs on desktop and emulated mobile, including against
  the production build using a temporary local static server.
- `pnpm test:cad`: built renderer checks visible geometry/text/dimension pixels,
  measured zoom change, fit, layers, desktop pan/mobile pinch and close/reopen.
- Rollback-only `supabase/tests/dxf_files.sql` verifies bucket configuration,
  owner/member/outsider access, file limits, immutable metadata, missing and
  mismatched object finalization. Existing `file_isolation.sql` also passes.
- Browser tests mock Storage/Auth APIs. SQL tests use synthetic object metadata;
  they do not establish real Storage byte transfer or universal CAD fidelity.
  Representative real drawings and physical phones remain unverified.
- Main-thread parsing can block the page for complex/malicious geometry even
  within 10 MiB; iframe lifecycle isolation and the host timeout are not a secure
  CPU/memory sandbox. Worker/complexity evaluation remains required before public
  production rollout. No malware scanning or format conversion is claimed.
- No VPS deployment performed. Nginx/Caddy syntax has not been validated with
  server binaries here. Build emits large-chunk warnings, including the lazy CAD
  engine (~3.96 MB / 1.06 MB gzip). Existing security advisor warning:
  [leaked-password protection is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection);
  no new database security warnings were returned.

Pinned dependencies/licenses remain as documented in decision 018.


## Concurrent development servers

The application and standalone CAD prototype use separate Vite optimizer caches:
`node_modules/.vite-app` and `node_modules/.vite-cad-prototype`. Sharing the default
cache allowed the prototype to replace the app dependency set, removing PDF.js
and breaking PDF previews before the document was downloaded. Keep the caches
separate when running both development servers. No PDF loader or storage policy
change was needed; a saved two-page PDF rendered after cache isolation.


## Viewer presentation

Project DXF previews use a near-full-window canvas, a collapsible left layer list
with original CSS color swatches and visibility checkboxes, and a right floating
tool strip (fit, zoom, layers, information). Mobile starts with layers collapsed
and docks a scrollable layers panel above a horizontal bottom toolbar when opened. Only filename/close remain in the header;
read-only/fidelity and gesture guidance are available under Information. Loading
and errors stay visible, while the loaded status is screen-reader-only.
