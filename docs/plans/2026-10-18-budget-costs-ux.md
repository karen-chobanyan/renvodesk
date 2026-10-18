# Budget and costs layout and UX

Implement the ten approved improvements in live/demo FR/EN views without changing
schema, permissions, integer-cent calculations or voiding rules.

- [x] One top toolbar with Add cost.
- [x] Compact budget summary with Set/Edit budget beside its amount.
- [x] Cost ledger first, independent compact category breakdown alongside.
- [x] Aligned desktop columns and stacked mobile entries, loaded-record counts.
- [x] Shared budget/cost modals matching task dialogs.
- [x] Dirty guards, frozen edit revisions and successful-only confirmed reloads.
- [x] Remove Refresh; refresh on writes and returning to the tab/window safely.
- [x] Quiet voided rows, excluded-from-totals label and secondary void action.
- [x] Useful empty states with no repeated Add cost action or prominent zero rows.
- [x] Independent summary/list/loading-more errors with retained content and retries.

Verify mocked create/edit/retry/conflict/void flows, failed reload preservation,
independent read errors, pagination, return refresh while preserving open editors,
keyboard/focus behavior, and FR/EN desktop/mobile screenshots. Run lint, typecheck,
relevant unit/browser checks and build sequentially after browser checks (the build
can trigger dev-server reloads). Do not alter live project records.


## Verification results

- `pnpm lint`, `pnpm typecheck`: passed.
- `pnpm test`: 114 tests passed in 25 files.
- Project details, demo and Budget browser regression: 76 passed, 2 existing skips.
- Final focused create/recovery/modal/localization browser checks: 12 passed.
- Desktop/mobile FR/EN screenshots inspected using fictional demo records; no live writes.
- `pnpm build`: web, prerender and API passed; existing large-chunk advisory remains.
- Browser APIs are mocked; these checks do not establish live database isolation.

Shared presentation lives in `cost-layout.tsx` and `cost-dialogs.tsx`. Independent
session-scoped queries retain loaded pages and summaries through read errors. Modal
snapshots advance only after an explicit successful reload. The component reference
links to the working fictional ledger/dialogs and shows the budget summary.
