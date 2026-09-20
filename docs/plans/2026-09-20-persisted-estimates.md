# Persisted draft estimates

- [x] Add organization/project-scoped draft estimates with atomic line snapshots, server totals and revision checks.
- [x] Reuse the estimate line editor for live drafts; add project estimate list/create and protected editor route.
- [x] Verify decimal rounding, invalid payloads, cross-tenant links, stale saves and UI persistence/conflicts.
- [x] Regenerate database types and update documentation.

Draft only, EUR excluding tax. Store up to 100 validated lines as one JSON snapshot on the estimate row so each save is atomic. Database computes cents with per-line half-up rounding; clients never supply authoritative totals. Composite project foreign key preserves tenant ownership. No PDF, sending, acceptance, invoice numbering or tax rules.

Verification: 15 unit tests and 17 browser tests passed (one intentional skip). Browser coverage includes create retry, reload, decimal comma input, invalid quantities, conflicts and FR/EN. Live rollback SQL passed. Desktop/mobile screenshots reviewed. Auth advisor warns leaked-password protection is disabled; no estimate-schema findings.
