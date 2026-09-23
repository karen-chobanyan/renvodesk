# Private project DXF previews

Approved scope: upload DXF in Project → Documents and open a read-only preview.
Preserve owner writes, member reads, immutable keys and the 10 MiB limit. DWG,
editing, takeoff, CAD export and production deployment remain outside this milestone.

- [x] Share the prototype canvas engine; add bounded, abortable private-file loading and localized preview controls.
- [x] Add canonical DXF MIME to metadata and private bucket; retain existing policies.
- [x] Include only the canvas entry in the application build and hosting configuration; keep the landing independent.
- [x] Verify upload/reopen, controls, errors and member UI with browser tests; run rollback authorization tests on development database.
- [x] Regenerate database types, run relevant checks, record boundaries and deployment requirements.


Verification: 53 unit tests; 6 DXF integration browser cases on desktop/mobile
(in development and a built static preview), 6 built CAD rendering regressions,
6 landing browser cases; lint/typecheck/application build pass. DXF and existing
file isolation rollback SQL pass on development. Screenshots inspected. Types
regenerated without a schema-type diff. Build warns about large lazy chunks.
A temporary static-server connection reset caused one initial browser failure;
raising its connection queue and rerunning serially passed all 6 cases.
Production hosting and real authenticated Storage byte transfer were not tested.
