# Direct CAD viewer component

Historical milestone; decision 021 later retired the standalone prototype.

- [x] Replace iframe messaging with a reusable React canvas component that owns the CAD manager and releases it on unmount.
- [x] Use it in saved DXF previews and the standalone prototype; remove the unused canvas HTML entry and hosting exception.
- [x] Update renderer and project-file browser tests for direct canvas mounting, rapid close/reopen, and existing controls.
- [x] Run lint, typecheck, unit, build, CAD, and relevant application browser tests; update architecture notes with actual results.
