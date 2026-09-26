# 027 — GitHub Actions CI before deployment automation

Date: 2026-09-25. Status: implemented locally; first GitHub run pending.

RenvoDesk uses GitHub Actions on pull requests, pushes to `main` and manual
dispatch. The first job checks lint, types, unit tests and builds the web and API
packages from the frozen pnpm lockfile. A dependent job runs the mocked desktop
and mobile Chromium browser suite and retains failure reports briefly. Both jobs
use read-only repository permissions and pinned Node/pnpm versions.

CI has no deployment credentials. The browser fixtures use a fake publishable key;
they do not reach customer data. The validation build is not a production release:
`SITE_URL` and production public configuration are intentionally absent on the
runner. The existing Nginx release process remains manual. Live Supabase rollback
SQL tests, Storage transport, Auth email and production checks are separate gates.

After the first successful GitHub run, require both CI job checks on `main` in
repository branch protection. Deployment automation should be designed only after
the Fastify production process and release/rollback procedure are defined.

See docs/CI.md and docs/plans/2026-09-25-ci-foundation.md.
