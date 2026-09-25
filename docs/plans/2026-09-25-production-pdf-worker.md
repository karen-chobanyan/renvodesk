# Production PDF preview worker MIME fix

The saved PDF preview worked locally but failed on renvodesk.com before loading its
page count. The published `pdf.worker.min-*.mjs` returned HTTP 200 with
`Content-Type: application/octet-stream` and `X-Content-Type-Options: nosniff`.
The browser rejects that module worker. The repository Nginx template already
maps `.mjs` to `application/javascript`; the live HTTPS configuration lacked
that mapping.

- [x] Verify the live worker response and compare it with the deployed build.
- [x] Make the app request a fresh worker URL after the server MIME fix so cached
  responses with the old headers do not keep breaking previews.
- [x] Add a production check for the worker's MIME type to the deployment guide.
- [x] Apply the existing `.mjs` mapping to the VPS HTTPS server block, validate
  Nginx, and reload it.
- [x] Confirm the live worker responds with a JavaScript MIME type and reopen the
  saved PDF in the production browser.

The active Nginx config was backed up, updated and validated on the VPS. The
worker now responds with `Content-Type: application/javascript` from both the
loopback and public HTTPS addresses. A browser request made during the reload
window cached the earlier bad response under the first cache-busting URL, so a
second URL revision was used for end-to-end verification.

The second URL revision was published after the server mapping was active.
Production `app.html` matched the local build hash after publishing; old hashed
assets were retained for open tabs. The live worker returned HTTP 200 and
`Content-Type: application/javascript`. In Chrome, the saved two-page PDF
rendered visually, showed `Page 1 / 2`, and the Next/Previous controls displayed
both pages. This establishes the current production behavior, not how long the
preview failed before this incident.

Local verification: `pnpm typecheck` and `pnpm build` passed. The desktop
`sign in, create company, reload and sign out` Playwright test passed, including
the two-page PDF preview. Targeted Biome check passed. Repository-wide
`pnpm lint` is blocked by the pre-existing formatting of ignored
`.vscode/settings.json`.
