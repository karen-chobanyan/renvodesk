# CI foundation

Goal: check the web and Fastify workspace on GitHub before a change is merged,
without changing the existing manual Nginx publication process.

- [x] Add a GitHub Actions workflow for pull requests, pushes to `main`, and
  manual runs, with read-only repository permissions and no deployment secrets.
- [x] Install the pinned Node/pnpm versions and frozen lockfile, then run lint,
  typecheck, unit tests and build for both workspace packages.
- [x] Run the browser suite in Chromium using only synthetic Supabase test
  configuration and capture failure diagnostics.
- [x] Document the distinction between CI validation and production publishing.
- [x] Run the workflow commands locally where possible and validate the YAML.

No automatic VPS publication, privileged Supabase operation or live database
isolation suite is part of this first CI gate.

Local verification: frozen offline install, lint, typecheck, 67 unit tests,
web/API build, and the CI-style Chromium suite (79 passed, one existing desktop
skip) passed. Ruby parsed the workflow YAML and `git diff --check` passed. The
GitHub-hosted workflow and branch protection have not been exercised yet.
