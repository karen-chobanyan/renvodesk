# Saved projects

- [x] Add a company-scoped project register with RLS, bounded text fields and server defaults.
- [x] Connect create/list in the authenticated workspace, with French/English, retry, loading and empty states.
- [x] Test real database isolation and mocked desktop/mobile persistence; regenerate types and run checks.

This milestone creates and lists projects. Editing, budgets, estimates and files remain subsequent milestones. No fake financial figures in the live register. Project UUIDs make create retries recoverable; no update/delete grants yet.

Verification: live rolled-back SQL isolation test passed; security advisors returned no findings. Playwright passed 17 tests (one desktop-only skip), including create/reload and recovery after a lost insert response in both viewports. Desktop/mobile screenshots reviewed. Browser API calls are mocked; live SQL tests enforce actual database policies.
