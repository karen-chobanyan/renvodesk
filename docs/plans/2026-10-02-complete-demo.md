# Complete demonstration workspace

Goal: every live `/workspace` screen has a fictional, in-memory counterpart under
the demo shell, with enough data to show its layout and main interactions.

## Gap (before)

Demo covered `/projects`, a single-page `/projects/:id`, one `/estimates/:id`
editor and `/design-system`. Missing: project tabs (tasks, budget, estimates,
documents, sketches, activity), company estimates register, clients and
properties, schedule, team, company settings and account settings.

## Plan

- [x] `src/features/demo/demo-data.ts`: fictional records relative to today
  (tasks, costs, budgets, estimates with lines/events, files, sketches,
  activity, clients/properties, team/invitations, company settings).
- [x] Extend `DemoProvider` to hold mutable session state for tasks, costs,
  estimates and clients so edits survive tab/route changes until reload.
- [x] Demo project detail with `?tab=overview|tasks|budget|estimates|documents|activity`
  using the live project-detail classes and copy.
- [x] Demo documents: real DXF viewer (fictional fixture copied to `public/demo`),
  image viewer, generated estimate PDF preview, voice-note AI review with a
  fixed fictional transcript, Excalidraw sketches with in-memory scenes.
- [x] Estimate editor: multiple estimates per project, draft/sent/accepted/declined
  workflow recorded in memory, PDF download from demo data. Legacy
  `/estimates/:projectId` links open that project's first estimate.
- [x] New routes: `/estimates`, `/schedule`, `/clients`, `/team`, `/settings`,
  `/account`; demo sidebar links to each.
- [x] Every demo screen keeps explicit demo labelling; no live data, no network
  writes, no claims of email delivery, VAT or invoicing.
- [x] Update foundation e2e tests and add a demo route smoke test.

## Verification

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`
(foundation + demo specs), manual check at desktop and mobile widths in FR/EN.
