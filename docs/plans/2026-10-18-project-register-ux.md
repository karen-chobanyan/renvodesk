# Project register layout and UX

- [x] Replace the repeated landing-style heading, large counters and instructional
  sidebar with one compact project header and a full-width register.
- [x] Share the register presentation between saved projects and the fictional demo:
  counted status filters, visible search control, reset, result count, and schedule shortcut.
- [x] Keep loaded-only filtering explicit, show loading/error/empty states in the list,
  and place pagination beside its scope. Make project rows readable on phones.
- [x] Preserve create/retry, role permissions, company query state and FR/EN copy.
- [x] Verify lint/typecheck and focused desktop/mobile browser flows, including
  filter recovery, keyboard controls and long project names; document results.

No schema, provider, financial calculation or production changes.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (114 tests) and `pnpm build` passed.
  Build retains large optional editor/CAD chunk warnings.
- Focused Playwright run on port 5174: 17/18 passed initially. The mobile
  sign-in/create-company flow timed out later in the existing project-edit conflict
  sequence; its isolated rerun passed (14.9 seconds). All 18 selected scenarios
  therefore passed, with that initial intermittent failure recorded.
- Selected scenarios cover shared shell bounds, company/cache navigation, member
  controls, live create/retry, demo creation, filtering/reset, FR/EN, long names,
  mobile overflow and dialog keyboard dismissal. APIs are mocked in these tests.
- Visually inspected the connected register at desktop and 390px mobile widths;
  captured only fictional demo records for the deliverable preview.
- No live record writes or deployment performed.
