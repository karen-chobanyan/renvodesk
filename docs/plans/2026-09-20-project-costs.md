# Project budgets and actual costs
- [x] Add isolated budget/cost tables and exact server totals, revision checks and voiding.
- [x] Replace fictional financial overview with live budget, actual costs and remaining allowance.
- [x] Add localized entry/edit/void flows, pagination and recovery.
- [x] Verify SQL isolation, money calculations, browser flows and responsive layout; update docs.

Verified lint, typecheck/build, 28 unit tests and 25 browser tests (one intentional skip); desktop/mobile layouts inspected. Supabase migration applied, types regenerated and rollback isolation/aggregate tests passed. Security advisor reports only the existing leaked-password warning. Browser flows mock API responses.
