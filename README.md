# RenvoDesk

Frontend foundation for a renovation SaaS. French and English; fictional demo data.

## Run

Requires Node 20.19+ (or a supported newer LTS) and pnpm 10.

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:5173. No environment variables or Supabase account required.

## Verify

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

## Included

Responsive workspace, project search/status filters, new demo project dialog,
project overview, editable estimate with decimal-safe line totals and session-only
saving, French/English switch, component showcase, shared visual tokens.

## Boundaries

Demo data only. No real accounts, file storage, invoice issuance, tax configuration,
payments, or drawing editor yet. Reloading resets demo edits. Do not use for customer
data. Costs and contracts are illustrative, not derived from invoice records.
The floor-plan thumbnail is decorative and not an actual or editable project plan.

## Layout

- `src/components/ui`: local UI primitives (shadcn/Radix pattern).
- `src/components`: shared layout and product patterns.
- `src/features`: projects, estimates, component showcase.
- `src/lib`: locale, demo state, utility functions.
- `tests`: Playwright browser flows.
- `docs/plans`, `docs/decisions`: implementation plans and architecture decisions.

See DESIGN.md for visual rules and AGENTS.md for implementation requirements.
Before deploying BrowserRouter routes, configure SPA history fallback on the host.
