# Storage quotas: operations and verification

The application allocates 1,000,000,000 bytes per account across organizations it
created, and 1,000,000,000 bytes per organization. Both checks run when a file or
sketch save is reserved. Project attachments and every sketch revision count. A
pending file or sketch save holds its declared capacity until it is completed or
safely canceled. Workspace members do not receive or consume a second allowance.

The accounting tables are in the private Postgres schema. Clients read only the
owner-authorized `read_storage_usage` RPC. Account and workspace counters are
updated by source-row triggers in the same transaction as reservations and state
changes. `PZ101` means account full; `PZ102` means workspace full; `PZ103` means
accounting unavailable. The app must never treat `PZ103` as zero usage.

## Recovery

- Pending project files: retry or verify the upload, or remove the entry. A charge
  is released only after the object is absent and metadata reaches `deleted`.
- A failed sketch save can be retried with its original save UUID. The editor can
  cancel an incomplete save: it marks the attempt canceled, removes both objects
  through Storage API, verifies their absence, then releases the reservation. If
  removal fails, retry cancellation. The editable drawing remains open.
- Committed sketch history is immutable and currently cannot be deleted. If it
  fills an allowance, users retain read/export access but may be unable to reclaim
  enough space without a later retention/deletion feature. Never manually remove
  rows from `storage.objects`; that can orphan stored bytes.
- A response lost after reservation should reuse its UUID. A new UUID would take
  another allocation. Do not auto-expire reservations based only on age.

## Read-only reconciliation

Run only against the RenvoDesk project. The query returns aggregate counts and
bytes, without file names, object paths, customer content or signed URLs.

```sql
with allocation_totals as (
 select account_id,
  coalesce(sum(bytes) filter (where state='used'),0) used,
  coalesce(sum(bytes) filter (where state='reserved'),0) reserved
 from private.storage_allocations group by account_id
), mismatches as (
 select count(*) n from private.account_storage_quota q
 left join allocation_totals a on a.account_id=q.account_id
 where q.used_bytes is distinct from coalesce(a.used,0)
    or q.reserved_bytes is distinct from coalesce(a.reserved,0)
)
select (select n from mismatches) account_counter_mismatches,
 (select count(*) from public.project_files f
  left join storage.objects o on o.bucket_id='project-files'
   and o.name=f.object_key
  where f.state='ready' and
   (o.id is null or (o.metadata->>'size')::bigint<>f.size_bytes)) ready_file_mismatches,
 (select count(*) from public.sketch_saves s
  left join storage.objects sc on sc.bucket_id='project-sketches'
   and sc.name=s.scene_key
  left join storage.objects pr on pr.bucket_id='project-sketches'
   and pr.name=s.preview_key
  where s.committed_at is not null and
   (sc.id is null or pr.id is null or
    (sc.metadata->>'size')::bigint<>s.scene_bytes or
    (pr.metadata->>'size')::bigint<>s.preview_bytes)) committed_sketch_mismatches,
 (select count(*) from storage.objects o where o.bucket_id='project-files'
  and not exists(select 1 from public.project_files f
   where f.object_key=o.name)) file_orphans,
 (select count(*) from storage.objects o where o.bucket_id='project-sketches'
  and not exists(select 1 from public.sketch_saves s
   where s.scene_key=o.name or s.preview_key=o.name)) sketch_orphans;
```

Reconcile workspace counters as well before rollout or repair. If any mismatch is
found, stop new uploads, investigate the object through Storage API, then repair
the ledger/counters in a reviewed transaction. Never guess from a paginated client
list or delete Storage metadata directly. Provider backup bytes and Postgres
metadata need separate recovery plans.

## Verification state

The quota migration is applied to the development project
`oripsywzngftarbprlgk`. Backfilled account, workspace and ledger charged bytes
matched immediately after migration. The rollback SQL fixture
`supabase/tests/storage_quotas.sql` passed there, covering nested quotas,
size checks in RLS, file/sketch lifecycle transitions, canceled saves and
owner/member access. A separate two-connection test reserved one byte from two
workspaces under a one-byte account limit: one insert committed, the other
returned `PZ101`, and ledger/counters each recorded one byte. Synthetic rows
were removed afterward.
The development inventory had no orphan objects, size mismatches or missing
committed objects before migration.

Live Storage API upload and deletion with a disposable verified account, and
physical-device browser capture remain to be verified. SQL inserts inside
rollback fixtures verify policy logic,
but do not prove the Storage service's preflight/final INSERT metadata behavior.
Do not present this migration as production verified until those checks pass.
