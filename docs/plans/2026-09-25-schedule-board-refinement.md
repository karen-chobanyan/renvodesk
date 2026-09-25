# Schedule board refinement

- [x] Replace the schedule's pill controls and soft container with a compact light, ruled layout using the existing workspace shell.
- [x] Make the weekly grid readable at desktop, tablet and phone widths; distinguish today without relying on color alone.
- [x] Reduce repeated metadata in weekly task cards while retaining full details in overdue and undated lists.
- [x] Preserve existing queries, filters, links, pagination, loading/error states and project task editing.
- [x] Verify FR/EN content, keyboard controls, responsive screenshots, lint and typechecking.

Scope: schedule presentation only. No task, authorization, database or routing changes.

Review follow-up:
- [x] Remove repeated week labels and improve card text legibility.
- [x] Place today's label in normal layout flow and correct mobile touch targets.
- [x] Recheck the desktop/mobile flow and screenshots.

Review verification: targeted Biome checks, TypeScript and both sequential
desktop/mobile lifecycle tests pass. Reviewed refreshed screenshots.

Validation: production build and targeted Biome checks pass. The task lifecycle
browser test passes at desktop and mobile sizes; a parallel desktop run timed out
once and passed when rerun alone. Reviewed both schedule screenshots. Native
buttons, checkbox and project links retain keyboard semantics. Full-repository
lint is currently blocked by unrelated formatting in `.vscode/settings.json` and
the in-progress `tests/fixtures/personal-language.ts`.
