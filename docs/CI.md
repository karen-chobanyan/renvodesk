# Continuous integration

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and manual
GitHub Actions dispatches. It uses Node 20.19.5, pnpm 10.23.0 and a frozen
workspace lockfile. The read-only `quality` job runs lint, typecheck, unit tests
and build for the web application and Fastify API. After that succeeds, the
`browser` job installs Chromium and its Linux dependencies, runs the desktop and
mobile Playwright suite with one worker, and uploads a failure report for seven
days if needed.

The browser job uses a fake publishable key and synthetic HTTP responses. Its URL
matches the development project's URL because existing browser fixtures intercept
that exact host. CI has no real account credentials or Supabase service key and
does not run the hosted rollback SQL suites. A passing CI result does not prove
live Auth delivery, Storage transport, database isolation or production hosting.

CI does **not** publish to the VPS. `pnpm build` uses preview metadata when
`SITE_URL` is unset; its output is a validation build, not a production artifact.
The existing [Nginx publication procedure](NGINX-DEPLOYMENT.md) still uses a
locally prepared `pnpm build:production` and explicit release upload. In GitHub
repository settings, make both `Lint, types, unit tests, build` and `Browser tests`
required checks on `main` after the workflow has run successfully once.

To reproduce the quality job locally:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

To reproduce the browser job without real credentials, use the CI environment
values in the workflow and run:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright starts its own Vite server so browser tests use their configured
feature flags. If port 5173 is already in use, set `PLAYWRIGHT_PORT` to a free
port. CI uses the default.
