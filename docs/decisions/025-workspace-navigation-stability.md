# 025 — Persistent workspace navigation

The authenticated workspace now has one parent layout and one live application shell across its routes. The route still uses React Router declarative mode and the existing URLs. Company identity, selection and language are resolved in that parent rather than fetched independently by each page and the sidebar.

TanStack Query holds browser server state for the current signed-in user. Company lists, roles, company records, project lists and details, estimate lists and details, client and team lists, and storage usage have explicit user/company keys. A user change destroys the client and its private cache. Known content remains visible during background refresh; first visits still show loading states. Writes update or refetch the affected cache entries. The few list/filter choices that should survive navigation stay in memory only for the current workspace session.

This is a presentation and data-fetching change, not a new authorization boundary. Every read and write still goes through the existing Supabase client and database RLS. Role checks continue to query membership, and owner-only routes remain guarded. Cached data is never shared between signed-in users or persisted to local storage.

The public landing and fictional demo remain separate from live workspace data. No schema, API, deployment or Next.js migration is part of this decision. The browser regression in `tests/auth.spec.ts` checks that the shell stays mounted, company/project reads are reused, and the project search survives navigation.
