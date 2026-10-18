# Client directory layout and UX

- [x] Share compact header, grouped search/reset controls and responsive client rows
  between the live directory and fictional demo, matching Projects.
- [x] Keep server-side search, type filtering and pagination; distinguish empty and
  filtered results and label loaded counts without implying a global total.
- [x] Move client editing into a focused dialog with focus return, unsaved-close
  confirmation and a close guard during saving. Preserve retry/conflict behavior.
- [x] Simplify the details drawer: one client identity, contact and billing details,
  followed by properties. Keep contact actions and Edit accessible on phones.
- [x] Verify live mocked create/retry/property flow plus demo search, edit, keyboard,
  long content and mobile layout; update design guidance and record actual checks.

No schema, authorization, service or production changes.

## Verification

- `pnpm lint`, `pnpm typecheck` and `pnpm build` passed. Existing optional
  editor/CAD bundle-size warnings remain.
- Eight focused desktop/mobile Playwright scenarios passed after correcting the
  French Edit column width: shared shell bounds, demo render, guarded editor/search
  and live mocked client/property creation with retry and project prefill.
- The live flow was then strengthened to hold a save pending and verify Escape
  cannot close the editor; both desktop and mobile reruns passed.
- Checked desktop and 390px phone layouts visually, including the editor and drawer.
  Saved screenshot uses fictional demo records only. Live data was read, not changed.
- Unit tests were not rerun for these presentation changes. No deployment or commit.
