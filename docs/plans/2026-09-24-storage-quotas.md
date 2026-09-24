# Account and workspace storage quotas

Status: development migration and app implementation in progress. Database
isolation and a two-connection account-limit test pass; live Storage API checks
remain open.

## Product contract

Confirmed by the user on 2026-09-24: an account has a shared allowance across
workspaces it owns, with an additional ceiling for each workspace. See decision 023.

- One GB means **1,000,000,000 bytes**, not one GiB. Store and compare integer bytes.
- A workspace is an organization. Each workspace has a 1 GB ceiling.
- Each account has a 1 GB ceiling across all workspaces charged to that account.
  Attribute each organization to its immutable `organizations.created_by` account
  for this first version; verify current owner membership during backfill. Do not
  infer quota ownership from the current uploader, email or client input.
- Each object counts once in its workspace and once in its owning account's total.
  These are nested ceilings, not additive allowances. Two workspaces with 600 MB
  and 300 MB leave 100 MB for that account. Invited membership in someone else's
  workspace does not consume the invited member's allowance.
- Both ceilings apply independently, even though the account ceiling is currently
  sufficient to bound its individual workspaces. New workspaces do not reset usage.
- Ownership transfer, personal file storage, paid upgrades and quota overrides are
  outside this milestone. Any future transfer must atomically reassign all charges
  and check the destination allowance. Never silently reassign on member removal.
- Include project attachments (documents, photos, audio, DXF) and all sketch scene
  and preview objects, including historical revisions and incomplete uploads.
- Exclude database rows, activity journals, browser caches, static application
  assets, downloaded PDFs generated locally, network traffic and backup copies.
  This is an application object-storage allowance, not total provider disk usage.
- Preserve existing per-object size/MIME limits. No monthly reset.
- At capacity, reject new reservations that increase usage. Continue existing
  reserved uploads, downloads, reads, file deletion, task/cost/estimate editing and
  other operations that do not increase stored objects. A sketch restore creates
  a new bundle and therefore needs capacity.
- Preserve existing over-limit data at rollout; deny additional reservations until
  sufficient space is available. Never automatically delete committed history.

## Existing integration points

- `src/features/files/file-service.ts`: `reserveFile` inserts `project_files`,
  uploads without upsert, then confirms ready. Deletion marks deleting, removes
  through Storage, and marks deleted. Duplicate UUID recovery already exists.
- `src/features/sketches/sketch-service.ts`: `persistSketch` reserves `sketch_saves`
  with scene/preview sizes and hashes, uploads two immutable objects, then calls
  `publish_sketch`. Partial and conflicting saves retain objects today.
- Migrations `20260920094807_project_files.sql` and
  `20260920141258_project_sketches.sql`: upload policies hold reservation locks;
  size validation currently happens at finalization/publication. That alone does
  not stop an oversized object from occupying storage before finalization.
- `src/features/sketches/sketch-editor.tsx`: autosave/error/retry and local export.
- `src/features/organizations/company-navigation.tsx`, company settings and
  `src/features/files/project-files.tsx`: usage display and upload feedback.
- `supabase/tests/file_isolation.sql`, `sketch_isolation.sql` and
  `project_activity.sql`: preserve lifecycle, permissions and activity semantics.

## Phase 1 — Prove enforcement and inventory existing storage

- [x] Resolve the account attribution interpretation above and record decision 023.
- [ ] Inventory both buckets read-only: object keys and actual metadata sizes,
  matching file/save rows, pending/deleting records, partial saves, missing objects,
  orphan objects, owner mapping anomalies and already-over-limit accounts.
  Do not print private URLs or customer content.
- [ ] Verify with synthetic Storage API uploads whether INSERT policies can check
  trusted object metadata size/MIME against the locked reservation at insertion.
  Test false declared sizes, missing metadata, direct API calls and both sketch
  keys. Do not assume client `Content-Length` or declared reservation sizes suffice.
- [ ] Preferred solution: enforce exact reserved size for each key in Storage RLS
  and preserve finalization validation. Keep application tables/counters separate
  from the provider-managed storage schema; do not add custom storage triggers.
- [ ] If exact metadata validation is not reliable, stop that implementation path:
  design conservative maximum-size reservations per object (10 MiB for files;
  sketch bucket maxima for both objects until a tighter enforced limit is proven),
  settling to actual size after verification. Explain temporary reserved overhead
  in the UI. A streaming Fastify gateway is a separate architecture decision that
  requires approval, not an implicit dependency of this plan.

Exit condition: every allowed upload has a server-enforced upper bound already
charged against both quotas, including rejected/unfinished publication attempts.

## Phase 2 — Transactional accounting

- [ ] Add private account/workspace quota rows with a default limit of 1,000,000,000
  bytes and nonnegative BIGINT used/reserved counters; allow accurate over-limit
  backfills without requiring used <= limit as a table constraint.
- [ ] Add an internal allocation ledger tied to organization, source file/save,
  bucket/object key and server-derived account. Use unique source/object identities
  so retries cannot allocate twice. Two sketch objects belong to one atomic bundle
  reservation. Keep released allocation tombstones for idempotency.
- [ ] Charge through transactional triggers on existing reservation inserts, so
  direct Data API writes cannot bypass checks. No browser writes to quota rows or
  ledger; use narrow private functions with explicit authorization, fixed empty
  search_path and revoked default execution grants. Preserve existing RLS.
- [ ] Serialize account updates before workspace updates, with consistent UUID
  ordering for multi-row work. Define source-row/account/workspace lock ordering
  across reservation, finalize, delete and cleanup; test concurrent paths for
  deadlocks. Do not implement check-then-insert without shared locking.
- [ ] Accept a reservation only if both used + reserved + requested <= limit.
  Roll back source metadata and allocation together on failure. Duplicate source
  UUID retries recover existing metadata even when no capacity remains; changed
  arguments are rejected. Failed uniqueness checks must roll back counter changes.
- [ ] Finalization moves reserved bytes to used bytes once, never adds the same
  charge again. Partial bundles retain their full reserved charge until committed
  or safely canceled. Publication conflicts retain the allocation and objects.
- [ ] File deletion releases its charge only at confirmed deleted state, after
  Storage API removal and verified object absence. Repeated confirmations are safe;
  failed deletion remains charged. Preserve `activity_was_ready` journal behavior.
- [ ] Add structured errors for account quota exceeded, workspace quota exceeded
  and unavailable accounting. Include only authorized limits/remaining bytes.
- [ ] Initialize rows idempotently for current and future users/organizations;
  preserve atomic organization onboarding. No signup-only assumption: existing
  accounts must be supported. Account deletion/ownership changes must not orphan
  allocations or silently release retained objects.

## Phase 3 — Recovery and reconciliation

- [ ] Keep current file cancellation/retry behavior working at full capacity.
- [ ] Add owner-only cancellation for **uncommitted** sketch save attempts. Mark
  the save canceling under lock to deny uploads/publication, remove both objects
  through Storage API, verify absence, then release its allocation once. Permit
  retries after partial removal. Keep source tombstones and reject reuse of canceled
  save UUIDs; a future edited save receives a new UUID.
- [ ] Add narrowly scoped sketch DELETE policies for canceling, uncommitted bundles
  only. Never grant deletion of committed revisions. Preserve lock coordination
  with `publish_sketch` and upload policies to prevent cancellation races.
- [ ] Do not free reservations merely because they are old. Expose pending attempts
  for explicit owner retry/cancellation; elapsed time alone does not prove absence.
  No scheduler/worker is needed for the first release.
- [ ] Provide an operator-run, read-only reconciliation report comparing ledger,
  source rows and Storage metadata. Correct drift only through a reviewed,
  idempotent maintenance procedure with writes gated during repair. Orphans are
  investigated and accounted for before enforcement, not automatically deleted.
- [ ] Document the remaining limitation: committed sketch history has no deletion
  flow. An account filled entirely by history cannot reclaim that space itself in
  this milestone. Preserve export/read access and show an honest explanation;
  history retention/deletion needs a separate explicit product decision.

## Phase 4 — Usage API and French/English UI

- [ ] Add an authenticated usage RPC with separate workspace/account responses:
  limit, used, reserved, available and status, using explicit authorization.
  Account totals are visible only to that account. Workspace totals are owner-only
  for this release. Do not expose other organizations through aggregate responses.
- [ ] Effective upload availability is the minimum remaining allowance of the two
  scopes; clamp display availability at zero for over-limit accounts. Authoritative
  checks always run on the server even if displayed usage is stale.
- [ ] Create `src/features/storage-usage` for service, formatting, localized copy
  and reusable usage meter; integrate workspace settings and an account-disclosure
  summary. Show used and reserved separately, with account allowance wording.
- [ ] Show warnings at 80% and 95% of used + reserved; at 100% explain the blocking
  scope and recovery choices. FR uses Go/Mo, EN GB/MB, with decimal units throughout.
  Accessible text must explain status without relying only on bar color.
- [ ] Integrate quota errors into file, photo/voice and sketch save flows. Preserve
  selected files and unsaved drawings. Pause quota-blocked autosave retries, retain
  local export and pending-edit close protection, and offer explicit retry after
  space is freed. Do not claim changes are saved.
- [ ] Refresh after reservation/finalization/deletion/cancellation and on relevant
  panel entry. Scope state to account/company and clear it when switching/signing
  out. Loading errors must not display zero usage or prevent reading documents.

## Phase 5 — Verification

- [ ] Rollback SQL isolation tests: owner/member/outsider/anonymous access; forged
  account/source/path; direct insert bypass; counter mutation denial; exact limit
  succeeds and one byte over fails; file + sketch combined accounting; multiple
  workspaces share the owning account ceiling; invited membership consumes none.
- [ ] Verify workspace ceiling independently using test-only differing account
  limits; production defaults remain 1 GB for both.
- [ ] Multi-connection concurrency tests: competing reservations in one workspace
  and across two workspaces of one account; only fitting operations commit. Test
  duplicate retries at capacity, transaction rollback and lock ordering.
- [ ] Lifecycle tests: no objects, partial sketch bundle, publication conflict,
  lost responses, repeated finalize/delete/cancel, failed Storage removal, mismatched
  actual bytes, cancellation racing upload/publication and released UUID reuse.
- [ ] Synthetic real Storage API tests in development project
  `oripsywzngftarbprlgk` only: forged sizes, direct uploads, policy enforcement,
  unchanged download permissions and cleanup. SQL fixtures and mocked browsers
  alone cannot prove the Storage service's metadata behavior.
- [ ] Unit tests for decimal-byte formatting, thresholds and error mapping; browser
  tests for FR/EN desktop/mobile usage, both blocking scopes, loading/errors,
  preserved file/drawing state, recovery and keyboard navigation.
- [ ] Regenerate `src/lib/supabase/database.types.ts` after migrations. Run
  `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, plus
  the SQL/concurrency/live Storage checks above. Record actual results separately.

## Phase 6 — Safe rollout and documentation

- [ ] Discover installed CLI commands/version; create migration files with the
  supported CLI workflow. Keep remote history and repository migrations aligned.
- [ ] Deploy additive accounting and quota-aware clients first. Backfill in a
  controlled write window, or use locking/dual-accounting that demonstrably excludes
  concurrent writes from being lost/double-counted. Include legacy reservations.
- [ ] Reconcile actual storage before enabling enforcement; inconsistent or
  unowned objects are a rollout blocker. Store truthful existing usage above 1 GB.
- [ ] Enable enforcement in development after all acceptance checks pass. Production
  changes and any destructive cleanup require separate explicit authorization.
- [ ] Provide an operational rollback that retains ledger/data, disables new
  uploads if accounting is uncertain, and preserves reads and safe deletion. Do
  not roll back by dropping accounting tables or reopening unchecked upload paths.
- [ ] Update README, AGENTS.md, the new decision document and storage operations
  documentation with final semantics, cleanup limits and verified behavior. Recheck
  current Supabase documentation before coding; avoid unrelated dependency upgrades.

## References and planning verification

Implementation verification on 2026-09-24:

- Development migration `20260924090253_storage_quotas.sql` applied. Backfilled
  account/workspace/ledger charges matched at 3,983,233 bytes; after synthetic
  test cleanup they still matched at the same value.
- Rollback `supabase/tests/storage_quotas.sql` passed, including exact workspace
  boundary, shared account boundary, RLS size checks, file/sketch transitions,
  cancellation and member denial.
- Two concurrent reservations from different workspaces under a one-byte account
  limit produced one commit and one `PZ101`; ledger and both counters recorded one
  byte. Synthetic rows were removed.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (56 tests) and `pnpm build` passed.
  Targeted desktop/mobile browser tests passed for storage usage (2), and the
  file/sketch workflows (6). The full `pnpm test:e2e` run had 49 passes,
  one skip and 20 failures. One quota display issue in mocked responses was fixed
  and its focused flow rerun. Remaining failures observed in that run involved
  the existing privacy panel intercepting clicks across unrelated routes; the
  full suite was not rerun after the focused fix.
- Real authenticated Storage API verification is pending. The disposable account
  created for the smoke test could not sign in; it and its records were removed.
  The smoke script is `scripts/verify-storage-quota.mjs` and requires a verified,
  disposable development account. Do not infer this result from rollback SQL.

- [Supabase Storage schema](https://supabase.com/docs/guides/storage/schema/design):
  query metadata read-only; perform object mutation through Storage API.
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control):
  upload enforcement uses Storage RLS; service credentials bypass it and must stay
  out of browsers and ordinary upload flows.
- [Supabase changelog](https://supabase.com/changelog): HTML fallback reviewed after
  the Markdown index could not be fetched. Validate deployed Storage behavior in
  Phase 1; documentation review does not establish actual size-check behavior.
