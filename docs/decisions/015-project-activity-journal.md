# 015 — Project activity journal

Date: 2026-09-22. Status: implemented.

## Decision

Saved projects have a Project journal / Journal du projet in their overview's
right-hand column, with five recent entries, and a full `?tab=activity` view.
The full view loads 20 events at a time and filters by project, tasks, documents,
estimates or costs. Entries group by the viewer's local day, show recording time
and author, and link to existing records or tabs. Deleted events have no target.
The global application navigation and fictional demo routes are unchanged.

`src/features/activity` owns read services, event presentation, localized copy and
journal UI. Use existing primitives, tokens and exact integer-cent formatting.
Unknown event versions/codes receive a safe generic label without a guessed link.

## Persistence and authorization

`project_activity` is an append-only projection, not the source of truth for any
business workflow. Private triggers capture meaningful project and task changes,
draft estimate edits, estimate decisions, cost allowances/expenses, completed file
uploads/deletions, sketch creation and committed sketch revisions. One multi-field
source change produces one event; revision-only no-ops produce none.

Events and source writes share a transaction. A failed activity insert aborts the
business write. There is no browser append endpoint and no client write grant.
The private SECURITY DEFINER trigger has a fixed table allowlist, empty search
path, fully qualified relations and explicit membership/actor checks. Member
activity can originate only from an update to a task assigned to that member.
Null-auth meaningful writes are rejected; any future maintenance/system path must
be designed explicitly. Existing source RLS and revision checks remain in force.

Every event has a same-company project FK. RLS permits current members to read
operational entries; only owners can read estimates and costs, including their
labels and amounts. No owner-only data is downloaded for client-side redaction.

Stable source keys derive from entity/operation/revision, estimate decision UUID,
sketch save UUID, or file/lifecycle boundary. Source retry handling ensures a single
committed event. Unexpected source-key collisions raise an error instead of silently
hiding a change. Existing `estimate_events` remains the authoritative decision log;
its insert alone creates decision journal entries, avoiding duplicate status events.

Payloads contain bounded labels, changed-field names, status transitions, exact
amounts as decimal cent strings and sketch revision numbers as applicable. They do
not contain entire source rows, notes, estimate lines, contact details or storage
URLs/keys. Actor UUIDs have no cascading user FK. Display resolves “You” or a current
team-directory email (first 50 directory entries), with “Team member” as the fallback
for unavailable/removed/unloaded authors. Do not infer absence from a partial page
or persist email snapshots.

## File lifecycle and history

The internal `project_files.activity_was_ready` flag is set when a file reaches
ready and retained through deletion. It has no client insert/update grant. This
prevents cancelled unfinished uploads from appearing as deleted documents. The
migration seeds the flag for currently ready files. Existing in-flight deletions
have uncertain provenance and are not inferred. No object bytes are modified.

`project_activity_tracking.started_at` is a server-owned singleton recording the
rollout boundary. Existing projects start with no invented history. There is no
historical backfill, including estimate decisions recorded before rollout.

## Pagination and refresh

Queries explicitly scope company/project, apply category and RLS before the limit,
and use `(occurred_at DESC, id DESC)` keysets without losing Postgres timestamp
precision. The covering index begins with organization/project. Rows that commit
late or arrive during pagination appear on Refresh; pagination is not a frozen
snapshot. No total count is inferred from loaded pages.

Overview and Activity remount on entry. Other working panels stay mounted as before,
so their unsaved forms survive visiting the journal. The journal also reloads when
the project revision changes in its edit dialog and on explicit Refresh. This covers
all visible mutation paths without adding the callback/context originally proposed:
tasks, costs and files are edited in other tabs, while estimates/sketches have their
own routes. There is no event bus, background polling or Realtime subscription.
Request generations and user/company/project/role keys discard stale results.

## Boundaries

Committed sketch revisions appear individually; no autosave grouping is shipped.
Restores are ordinary published revisions and are not identified as a special
restore event. Manual site notes, email digests, unread state, mentions and AI
summaries remain deferred. Recording an estimate decision does not send an email
or verify customer acceptance. The journal is not a compliance audit.

Migration `20260922113446_project_activity_journal.sql` is applied to the RenvoDesk
development project (`oripsywzngftarbprlgk`), with matching remote/local history and
regenerated database types. The migration was first exercised inside a rollback-only
transaction. `supabase/tests/project_activity.sql` covers capture, financial RLS,
actor checks, retry/no-op/conflict behavior, file/sketch publication, exact payloads,
deleted history, keyset ties and rollback on journal failure. File deletion uses a
synthetic metadata fixture for an already-removed object, never a direct SQL deletion
of storage.objects. Browser tests use mocked APIs and do not prove live Storage
transport or email delivery.

## Verification

On 2026-09-22: lint/typecheck/build passed, 42 unit tests passed, and the full
browser suite passed 49 tests with one intentional mobile-only desktop skip.
All ten affected rollback SQL suites passed on the hosted development database.
Desktop/mobile journal screenshots were visually reviewed. Advisors reported no
new journal findings; prior Auth and unrelated schema notices remain unchanged.

Sidebar refinement: site/client/address/status and Edit details appear only in the
project header. The right-hand column contains the journal without footer links;
full history is accessible through the Activity tab and clients through the main navigation.
