# Project details and editing

- [x] Add owner-scoped update policy, immutable tenant/identity grants and revision checks.
- [x] Add a protected live detail route, localized editing/status form, save/error/not-found/conflict states.
- [x] Verify stale edits and tenant isolation in rollback SQL; test desktop/mobile save and conflict flows.
- [x] Regenerate types and update current-state documentation.

Use integer revisions and a database trigger to require increments. Updates match organization, project and loaded revision; zero matching rows require reloading, never silent overwrite. No deletion, financial changes, role expansion or new dependencies.

Verified: live rollback SQL passed; security advisor had no findings. Browser tests passed 17 with one intentional skip, including editing, persistence, conflicts and unavailable records at both viewport sizes. Fixed the status label after an accessibility locator failure. No real email delivery tested.
