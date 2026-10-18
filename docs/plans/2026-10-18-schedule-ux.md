# Schedule layout and UX

- [x] Share a compact header, filters and accessible week navigation between live and demo schedules.
- [x] Make task titles link to project Tasks; clarify single-date/undated labels and empty views without changing reads or permissions.
- [x] Replace the schedule-specific print styling with shared tokens, a readable desktop week and compact mobile agenda.
- [x] Update FR/EN copy, demo coverage and DESIGN.md; verify navigation, filtering, loading/error/empty states and responsive layouts.

Scope: presentation and navigation only. Keep date-only semantics, server filters,
50-task pagination, revision checks and demo/live separation. Task creation and
editing continue in the project's existing Tasks panel.

Verification:
- `pnpm lint` and `pnpm typecheck` passed.
- `pnpm build` passed (existing optional editor/CAD large-chunk warnings).
- Focused Playwright checks passed on desktop and mobile: live shell bounds,
  demo schedule rendering, demo task creation/navigation, localized schedule
  controls/empty views/keyboard links/filter focus, and live task save/retry,
  revision conflicts, schedule filtering/error recovery and deletion.
- Visually inspected fictional FR/EN schedules at desktop and phone sizes,
  including populated and empty weeks. Unit and full browser suites not rerun;
  no database, authorization or service changes.

Follow-up: keep all seven day columns/agenda headings visible in empty weeks,
including personal filters. Show one compact guidance block below the calendar.
Follow-up verification: lint, typecheck and four focused live/demo desktop/mobile
browser scenarios passed; visually verified the empty desktop week.
