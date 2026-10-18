# Task editor modals

- [x] Replace inline task creation/edit forms with a shared accessible dialog shell
  in live and demo project Tasks, preserving permissions and service behavior.
- [x] Keep the list behind the modal; provide localized titles, compact responsive
  fields, explicit Save/Cancel, close/discard protection and focus restoration.
- [x] Preserve the open task revision, retry UUID and values on validation/save
  failures. Keep conflict recovery explicit.
- [x] Adapt existing task browser flows to dialog scope and verify keyboard close,
  dirty cancellation, live retry/conflict/member edits and FR/EN mobile layouts.

The subsequent toolbar refinement removes Refresh from project Tasks. Automatic
updates after task writes and Retry/conflict recovery remain available; the company
Schedule retains its refresh control. Lint, typecheck and the two desktop/mobile
task workflow cases pass after this removal. The reviewed overview column heights
and automatic refresh on returning to Tasks remain separate follow-ups.

## Results

Lint, web/API typecheck and production build pass. Sixteen distinct focused
browser cases pass across desktop/mobile, including task create/retry/conflict,
member edits, linked records, empty-state creation, focus restoration, immediate
Escape after editing, reverting fields and confirmed/cancelled browser Back.
Fictional FR/EN modal screenshots inspected. Browser APIs are mocked; no live
records were edited. Build retains the existing large-chunk advisory.
