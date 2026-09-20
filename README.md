# RenvoDesk

Renovation SaaS foundation with French/English authentication and company onboarding,
plus separate fictional project/estimate demos.

## Run

Requires Node 20.19+ (or a supported newer LTS) and pnpm 10.

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:5173/login. Copy `.env.example` to `.env.local` and fill in the
Supabase URL and publishable key for authentication. See [Supabase setup](docs/SUPABASE.md)
for required email redirect settings. `/projects` remains a demo without credentials.

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

Authentication and organization records use Supabase. Projects and estimates are still
fictional demos; reloading resets their edits. File storage, invoice issuance, tax,
payments and drawings are not connected. Do not enter customer records into the demo.
Costs and contracts are illustrative, not derived from invoice records.

Live SQL verifies company isolation; browser auth tests use mocked API responses.
Real email confirmation and recovery delivery require the setup steps in docs/SUPABASE.md.
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
