# Estimate workflow — owner-recorded decisions

- [x] Add owner-scoped, immutable transition history and frozen sent snapshot.
- [x] Verify transitions, idempotency, revision conflicts and tenant/role isolation locally.
- [x] Apply approved migration, regenerate database types and verify hosted policies.
- [x] Connect FR/EN transition controls, read-only issued content, list statuses and snapshot PDF exports.
- [x] Test desktop/mobile workflow, PDF content, retries and existing regression checks.
- [x] Update decisions and implementation boundaries.

Draft → sent → accepted or declined. These are records made by the owner of
communication performed elsewhere; no emails, public links, electronic signatures,
invoices or automatic project budget changes. Each transition requires a reference
note and explicit confirmation. Server timestamps record entry time, not delivery
or customer signature time. Sent title/lines and company/site snapshot are frozen.
No reopening or silent rewriting of sent/accepted content. Empty drafts cannot be
marked sent. Stable request UUIDs recover uncertain responses; expected revisions
prevent stale decisions. Existing owner-only financial access remains unchanged.

Applied migration: `20260920143945_estimate_workflow.sql`, with explicit user approval.
Generated types updated. Local and hosted SQL isolation passed; FR/EN PDF output
reviewed visually and extracted to verify frozen contact data. Browser coverage uses
mocked API responses; database authorization is covered separately by hosted SQL.
