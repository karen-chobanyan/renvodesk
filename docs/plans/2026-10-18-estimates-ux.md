# Estimates register layout and UX

- [x] Share compact register header, grouped search/reset, status filters, responsive rows and contextual empty states between live and demo.
- [x] Apply status filters on the server before 20-row pagination; include status in company/user-scoped cache keys and preserve current search semantics.
- [x] Add New estimate dialog with a paginated project chooser and title, using existing create/recovery services and stable request IDs.
- [x] Complete FR/EN copy, loaded counts, distinct recorded-status badges, keyboard focus and dialog busy/unsaved guards.
- [x] Update DESIGN.md and focused browser tests; verify desktop/mobile navigation, search/status combination, pagination, creation/retry and empty/error states.

Scope: register presentation and creation entry point. No schema, permissions,
financial calculations, estimate transition, PDF or delivery changes. Demo uses
only its in-memory store. No customer records will be created for verification.

Verification:
- `pnpm lint`: passed (235 files).
- `pnpm typecheck`: passed; final web/API build also passed TypeScript checks.
- `pnpm test`: 114 tests passed across 25 files.
- `pnpm build`: passed, with the existing large-chunk advisory.
- Focused Playwright suite: 12 desktop/mobile checks passed, covering register
  bounds, combined filters/search, pagination, updated drafts on return, project
  loading errors/pagination, interrupted-create recovery, modal keyboard/dirty
  guards and demo parity. Browser API calls use mocked fixtures.
- Inspected EN desktop and FR/EN mobile layouts and creation dialog in the browser.
  Verified the live workspace's status filter read-only; no customer data created.
- `git diff --check`: passed.
