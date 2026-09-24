# Workspace navigation stability

1. Keep one live `AppShell` mounted around all `/workspace` routes. Resolve the selected company in one parent layout and share its identity and role with the sidebar and child pages. Preserve existing URL shapes and owner-only route guards.
2. Add a session-scoped TanStack Query client for browser server state. Cache company lists, roles, company records, project lists/details and other high-visibility reads by user/company identity. Keep known data visible during background refresh; invalidate or update affected keys after writes. Clear the cache when the signed-in user changes.
3. Remove page-local cold-start fetches and duplicated company lookups from the first routes. Apply workspace language before painting newly selected company content, and keep first-load placeholders stable.
4. Verify owner/member isolation, company switching, settings updates and desktop/mobile navigation with existing tests plus a focused browser regression that delays requests and checks the shell, labels and content do not disappear on return navigation. Run lint, typecheck, unit tests and build.

No database schema, policy, deployment or routing URL changes are planned.
