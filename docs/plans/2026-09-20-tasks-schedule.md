# Tasks and weekly schedule
- [x] Add project-linked task schema with tenant policies, immutable identity, validated dates and revision concurrency; verify isolation.
- [x] Implement FR/EN task creation/editing/status/deletion and recoverable failures.
- [x] Add company weekly schedule with overdue/undated views, pagination and project links; replace fictional task prompts.
- [x] Test date boundaries, browser flows and responsive layout; update docs.

Verified: lint, typecheck, build, 25 unit tests, 19 desktop/mobile browser tests (one intentional skip). Reviewed responsive schedule screenshots. Applied migration and regenerated types; rollback SQL task isolation checks passed. Advisor has only the previously documented leaked-password warning.
