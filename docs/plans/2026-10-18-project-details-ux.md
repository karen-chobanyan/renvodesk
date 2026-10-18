# Project details layout and UX

Implement the 12 approved improvements, preserving existing roles, server scoping,
revision checks, file operations and exact cost calculations. No schema changes.

- [x] Compact shared project header.
- [x] Persistent, mobile-discoverable project navigation.
- [x] Tabs own section navigation; creation and capture actions stay in their relevant sections.
- [x] Prioritize tasks; quieter recent activity and supporting previews.
- [x] Compact actionable budget summary and unset-budget entry point.
- [x] Consistent tab toolbars and schedule action placement.
- [x] Project estimates use the shared register and creation dialog.
- [x] Consolidate upload controls and simplify document row actions.
- [x] Relevant-item navigation and actionable, role-aware empty states.
- [x] Shared project editor with dirty Save/Cancel, feedback and field focus.
- [x] Freeze editing revision; preserve drafts through failed reloads and navigation.
- [x] Refresh overview after related writes without remounting working forms.

Keep live/demo presentation and FR/EN copy aligned. Verify mocked project edits,
conflicts, background refresh, failed reload, navigation guards, overview freshness,
focused task/file links, estimate creation, and existing file/sketch flows. Run lint,
typecheck, relevant unit/browser checks and build. Inspect fictional desktop/mobile
screenshots. Do not mutate live account/project data during verification.

## Verification

- Lint and web/API typecheck pass.
- All 114 unit tests pass (25 files).
- 42 distinct relevant Playwright cases pass across desktop and mobile: project
  editing and conflicts, failed reload/draft preservation, navigation guards,
  overview refresh, scoped task/file links beyond the loaded page, empty-state
  entry points, estimate creation, file operations, activity and demo parity.
- Fictional FR/EN desktop/mobile screenshots inspected; mobile overflow and sticky
  navigation checked, along with keyboard focus and disclosure dismissal.
- Web/API production build passes with the existing large-chunk advisory.
- Browser APIs are mocked. No live customer records were changed; database
  isolation and production behavior were not revalidated for this UI change.

## Review refinement

Remove the duplicate overview shortcut row in live and demo views, remove its
unused styles and cross-tab voice-capture plumbing, and keep Documents capture
actions. Update the existing navigation/capture checks and verify desktop/mobile.

Refinement verified: lint, web/API typecheck and six existing desktop/mobile
browser cases pass. Updated fictional desktop/mobile previews inspected.
