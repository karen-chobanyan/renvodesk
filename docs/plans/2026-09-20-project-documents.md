# Project documents redesign

- [x] Build an aligned document library with file register and separate sketch gallery.
- [x] Refine upload, file actions, empty states, and responsive spacing in French and English.
- [x] Verify upload/preview/delete, sketch flows, and desktop/mobile layout.

Preserve backend permissions, pagination, upload recovery, and retained tab state. Use existing local Noto Sans for this scoped surface and lightweight line artwork; no new dependencies.

Validation: lint and TypeScript pass. Six desktop/mobile browser checks passed for file lifecycle, retained tab state, and sketch save/reopen/history/member access. Re-ran both file lifecycle checks after aligning DOM order; desktop and mobile screenshots inspected.
