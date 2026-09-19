# Application foundation

Scope: local, frontend-only reference application with fictional data. No production
accounts, uploads, invoices, or backend integrations in this step.

Visual thesis: warm architectural surfaces, precise navy actions, generous breathing
room around dense working tables.
Content plan: persistent navigation, searchable project list, project context and
budget overview, estimate line editor, shared component showcase.
Interaction thesis: subtle route entrance, clear table hover/focus, quick native
modal transition; all respect reduced motion.

- [x] Scaffold React, TypeScript, Vite, React Router, Tailwind, shadcn primitives.
- [x] Establish tokens, shared shell, French/English dictionaries and formatting.
- [x] Implement reference project list/detail and estimate editing with demo data.
- [x] Add showcase, design/architecture notes and truthful setup documentation.
- [x] Run lint, typecheck, unit tests, build and desktop/mobile browser checks.

Decision: use Vite with React Router in declarative mode for the initial client.
Privileged operations will need server endpoints or Supabase Edge Functions before
real data is introduced. This scaffold is not a production authorization boundary.

## Verification

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 10 passed across calculation, project selection, and locale tests.
- `pnpm build`: passed.
- `pnpm test:e2e`: 9 passed, 1 intentionally skipped (mobile drawer on desktop).
- Screenshots captured for projects, project detail, estimate, components and mobile
  dialog; desktop/project estimate and mobile dialog visually reviewed.
- Reference route browser inspection found no page errors.

Resolved during verification: TypeScript 7 path configuration, locale key parity,
explicit field labels, table scroll positioning that caused mobile viewport overflow,
and keyboard/focus handling for mobile navigation via a Radix modal drawer.

Limitations: fictional session-only state; no backend/authentication/storage/payment
or drawing integration. No deployment or production access control has been tested.
