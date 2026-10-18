# Activity tab layout and UX

Implement the ten approved improvements using the existing journal services and
design system. Preserve append-only events, exact amounts, keyset pagination,
owner/member visibility and safe unknown/deleted-event handling. No schema changes.

- [x] Compact shared header and quiet history-start metadata.
- [x] Category toolbar, loaded-event count and filter reset.
- [x] Readable shared rows with adjacent actor/time metadata.
- [x] Omit redundant status changed-field text when a transition is shown.
- [x] Specific task/file destinations and truthful sketch action labels.
- [x] Expandable consecutive sketch revision groups, preserving every event.
- [x] Automatic return/window/write refresh without a routine Refresh button.
- [x] Retain filter, loaded pages and reading position while visiting project tabs.
- [x] Independent initial/refresh/pagination/metadata recovery and helpful empty states.
- [x] Live/demo parity, localized mobile layout and keyboard-accessible controls.

Verify model grouping/navigation, mocked cursor pagination and failures, retained
state and permissions, demo destinations, and FR/EN desktop/mobile screenshots.
Run lint, typecheck, unit tests, targeted browser checks, then production build.

## Verification

- Inspected fictional FR/EN desktop and mobile screenshots, including long sketch
  names and expanded revisions; no horizontal overflow in browser assertions.
- Focused Activity suite: 12 passed on desktop/mobile. Covers retained filters and
  cursor pages, reading position through refresh errors, independent tracking and
  actor failures, retry, automatic updates, member visibility, guarded task
  navigation, grouping and expansion retention after a new revision, and demo links.
- Surrounding project, Documents, Budget and full demo regression suite: 98 passed,
  2 existing mobile skips (desktop sidebar and duplicate PDF demo viewer check).
- Unit tests: 116 passed across 25 files, including exact item links, redundant
  status removal, and grouping boundaries (actor/sketch/time/day/intervening event).
- Lint, web/API typecheck and production build passed, including FR/EN landing
  prerendering. Vite retains its existing large editor/CAD bundle warning.

No live writes, schema changes or authorization changes. Tests use fictional or
mocked data; they do not establish live database isolation or Storage correctness.
