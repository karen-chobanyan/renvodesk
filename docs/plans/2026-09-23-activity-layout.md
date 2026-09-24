# Activity tab layout

Visual thesis: a precise, calm journal using the established Inter, navy and warm
surfaces, with aligned time/event/actor/action columns and clear date separators.
Content: project context, journal heading with filter/refresh toolbar, quiet tracking
start notice, grouped history and existing pagination.
Interaction: restrained row hover and existing focus feedback; reduced motion.

- [x] Align toolbar and strengthen full-tab heading; preserve compact overview.
- [x] Make full journal rows compact and responsive without changing event logic.
- [x] Run lint/types/build and journal browser checks; inspect desktop/mobile FR/EN.

No schema, service, permission or event-link behavior changes.

Validation: lint, TypeScript and build passed (existing large-chunk warnings).
All six journal browser checks passed across desktop/mobile with API mocks.
Reviewed English desktop and French mobile history and desktop overview screenshots.
Keyboard checks follow filter → Refresh → event action. Test consent is preconfigured
to keep the unrelated privacy overlay out of journal interaction checks.
