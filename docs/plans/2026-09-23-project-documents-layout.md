# Project Documents layout

Visual thesis: a calm architectural workspace with crisp dividers, Inter typography,
compact navy actions and real document/sketch content leading the page.
Content plan: compact project context and tabs; primary file workspace with upload
and capture controls; readable file register; secondary sketch preview column.
Interaction thesis: restrained button/row hover feedback, clear drag-target feedback,
and existing disclosure/dialog transitions; respect reduced motion.

- [x] Implement compact upload and responsive file register without changing lifecycle logic.
- [x] Align sketch creation and previews; tighten shared project header spacing.
- [x] Verify lint, types, build and relevant desktop/mobile browser flows; inspect screenshots.

Preserve FR/EN, member permissions, retry IDs, preview/deletion/capture behavior,
retained tab state and sketch modal workflows. No backend changes or dependencies.

Validation: lint, TypeScript and production build passed (existing large-chunk
warnings). Eight targeted browser cases passed across desktop/mobile: file and
capture lifecycle, sketch save/reopen/history/member restrictions, project tab
retention and member controls. FR/EN desktop/mobile screenshots inspected; keyboard
file-picker activation and horizontal overflow checked. Two existing test setups
now dismiss consent before interacting. Browser APIs are mocked; no live Storage
or database authorization claim. User deployment-document edits were untouched.
