# Company estimate register

The sidebar Estimates link now opens `/workspace/:organizationId/estimates` for
saved drafts. Demo estimates remain available only in the demo workspace.

The register reads summaries, not full line arrays, with project/client names through
the existing composite foreign key. Organization scoping and RLS remain unchanged.
Search is submitted explicitly and filters on the server before 20-row pagination.
A separate empty project embed is filtered by project/client text; its non-null check
is ORed with the estimate title. The visible project embed remains unfiltered, so
matching a title never removes its context. Search patterns are quoted/escaped for
PostgREST syntax. PostgreSQL ILIKE wildcards are supported in search text.

Rows use saved integer-cent totals, localized money, draft status and revision.
No financial aggregate, sending, acceptance, invoices or status transitions were
added. Creating a draft still starts within a chosen project. Load more is explicit;
search/reset remounts the result list to avoid mixing pages from older queries.
