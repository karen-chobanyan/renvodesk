# Project activity journal

Status: implemented; see decision 015 for final choices and verification.
Date: 2026-09-22.

## Product concept

Add **Journal du projet / Project journal**: a chronological, database-backed
record of meaningful saved work on a project. It should answer “What happened
recently?”, “Who changed it?” and “Where can I see the result?” A concise editorial
feed, grouped by day, gives the newsletter feeling without requiring email or AI.

Examples (fictional):
- 14:32 — You completed “Prepare bathroom walls”.
- 11:08 — A team member added “Kitchen progress.jpg”.
- Yesterday — You recorded acceptance of “Bathroom renovation estimate”.
- Yesterday — You added a materials expense of €245.00 excluding tax (owners only).

“All activity” means successful business changes in the implemented domains below.
Do not log clicks, views, keystrokes, failed attempts, local PDF downloads, pending
uploads or unsupported future features as completed work. This is an operational
journal, not a compliance audit, proof of customer consent or a notification inbox.

## Repository findings and integration points

- `src/features/projects/saved-project-overview.tsx` already has a right-hand
  `project-context` aside containing client/site details. Place the compact journal
  below that context in the overview; keep the global navigation sidebar unchanged.
- `saved-project-page.tsx` and `project-layout.tsx` own URL-backed tabs and retain
  visited working panels. Add `?tab=activity` for the full journal without changing
  existing hash mapping, dirty-form preservation or owner-only panel mounting.
- Project/task/cost/estimate mutations already use revisions and retry identities.
  Extend trusted database writes, not optimistic browser callbacks, to create events.
- `estimate_events` already stores append-only decisions with actor and recording
  time. It remains authoritative for estimate workflow history.
- `publish_sketch` commits immutable saves; file metadata distinguishes pending,
  ready, deleting and deleted states. These provide meaningful publication boundaries.
- `private.team_remove` clears task assignments and increments task revisions;
  these indirect changes must appear too, attributed to the acting owner.
- The team directory currently exposes member emails, not a profile-name model.
  Do not assume display-name profiles already exist.

## First-release experience

Overview: show the five newest visible events, day headings, a small domain icon,
a one- or two-line sentence, actor and local time. Add Refresh and “View all activity”.
Use existing tokens, Inter, dividers and muted labels; no decorative metric cards.
The journal loads independently so its failure cannot hide project context.

Full Activity tab: newest first, 20-row keyset pages, “Load older activity”, and
server-side category filtering (All, Project, Tasks, Documents, Estimates, Costs).
Hide financial filters for members and enforce this restriction in the database.
Counts describe displayed rows only; no global counts or unread badges in v1.

Mobile: stack the journal after project context and provide the same Activity tab;
avoid a second narrow sidebar or an independently scrolling tiny feed. Verify
390px and 1440px widths, long French labels, keyboard operation, visible focus,
loading/empty/error/retry states, and reduced motion.

Rows link to existing project tabs or estimate/sketch routes. Where record-level
anchors do not exist, open the relevant tab rather than inventing a deep link.
Deleted task/file entries retain a historical label, with no broken record action.
Do not embed attachments or signed storage URLs in the journal.

Use complete FR/EN event templates. Store event codes and structured values, not
translated sentences. Store server timestamps as instants; group and render them
in the browser's local timezone, with full localized dates available. Task due dates
remain calendar dates. Financial formatting retains exact cents and EUR excluding tax.

## Event coverage and capture contract

| Source | Events | Visibility | Capture boundary |
| --- | --- | --- | --- |
| Projects | Created; details/status changed | Members and owners | Insert or meaningful update |
| Tasks | Created; edited; status/dates/assignee changed; deleted | Members and owners | Insert/update/delete, including assignment clearing |
| Estimates | Draft created/edited; sent/accepted/declined recorded | Owners only | Draft row changes; decision row insertion |
| Cost allowance | Set/changed | Owners only | Successful allowance write |
| Expenses | Added/corrected/voided | Owners only | Successful expense transition |
| Files, photos, voice notes | Added; deleted | Members and owners | First transition to ready; deletion finalized |
| Sketches | Created; revision published | Members and owners | Sketch insert; save first becomes committed |

A multi-field edit emits one event containing allowlisted changed-field keys and
small relevant values (for example status from/to). Compare business fields with
`IS DISTINCT FROM`; a revision-only no-op emits nothing. Do not double-log estimate
transitions through both estimate updates and `estimate_events`.

Record each committed sketch revision; do not record pending saves. The full feed
may compact consecutive same-actor/same-sketch saves within five minutes into an
expandable group. Preserve every event and cursor underneath; pagination must not
lose revisions across group boundaries. Ship individual rows first if grouping
would delay correctness. A restore currently publishes an ordinary new save;
label it “revision published” unless a validated restore-source reference is added.

File deletion is logged only after completion, not when deletion starts. Removing
an unfinished reservation should not create a misleading “document deleted” event.
Company contact/directory edits are excluded because project details are snapshots.
Invitations and company administration are not project events; resulting task
assignment changes are included. No invoice/payment events exist yet.

## Persistence and authorization

Propose one `public.project_activity` table:

| Field | Purpose |
| --- | --- |
| id | Database-generated UUID |
| organization_id, project_id | Composite FK to the same-company project |
| occurred_at | Server-generated timestamptz |
| actor_user_id | Authenticated actor UUID, nullable for an explicitly authorized system context |
| event_type, category, visibility | Constrained event vocabulary and member/owner audience |
| entity_type, entity_id | Source identity; historical reference survives task deletion |
| source_key | Stable source operation identity, unique within organization |
| payload_version, payload | Small validated JSON object with allowlisted fields |

Index `(organization_id, project_id, occurred_at DESC, id DESC)` and evaluate an
additional category-prefixed index with representative query plans. Fetch 21 rows
to determine whether another 20-row page exists. Cursor comparison is strict on
`(occurred_at, id)`; apply tenant/project/category/RLS filters before the limit.
Newly arriving or late-committing rows are picked up by Refresh, which resets the
head and cursor. Do not claim a transactionally frozen pagination snapshot.

Grant authenticated SELECT only; enable RLS. Members see member-visible events in
their current organizations; owners also see financial events. Deny anonymous,
nonmember and removed-member access, including direct REST queries. No public
append endpoint, no client INSERT/UPDATE/DELETE, no client-selected actor/audience.
Never fetch owner-only payloads and hide them in JavaScript.

Use narrow private trigger functions to insert immutable events in the same
transaction as business changes. SECURITY DEFINER is justified only for this
append operation because clients cannot insert activity: fixed empty search_path,
fully qualified names, no dynamic SQL, revoked public execution, and explicit
actor/membership checks. Source authorization remains unchanged; test owner and
assigned-member paths. Null-auth maintenance writes must fail unless a deliberately
reviewed internal path is added; never silently attribute them to an owner.

Derive identities from persisted source operations: entity ID plus operation and
revision for normal writes; decision UUID for estimate transitions; save UUID for
sketch commits; file UUID plus lifecycle boundary for file events; deleted task ID
plus loaded revision for deletion. Document the exact mapping in SQL tests. Retries
must return/recover the same source change without another event. Suppress only
expected duplicate source keys, not arbitrary insert errors.

If event insertion fails, the business transaction fails too. This ensures a saved
change cannot silently lose its history, but makes trigger regressions operationally
significant. Keep triggers small and test all affected writes before rollout.

Retain minimal snapshots (bounded title/filename, status, selected amount) so deleted
or renamed records remain understandable. Do not copy full rows, notes, estimate
lines, addresses, emails, invitation secrets or storage keys into payloads. Event
text is plain escaped text. Exact monetary payloads use integer-cent decimal strings
where needed to avoid JavaScript numeric overflow.

For actor display, use “You” for the viewer and a current authorized team-directory
match where available; otherwise “Team member” / “Former team member”. Do not store
email snapshots or expose auth.users. Keep actor UUIDs as historical identifiers
without a cascading auth-user FK; user removal must not destroy journal rows.
Any future name resolver must be membership-scoped. Retain events in v1 with no
user deletion UI; production erasure/retention rules require a separate reviewed
policy, not a claim of indefinite compliance-grade retention.

## Refresh and history policy

Read on overview/full-feed entry, explicit Refresh, and successful relevant in-page
mutations. Add a small project-scoped invalidation callback/context with real call
sites in tasks, costs, files, sketches and project edits; do not introduce a general
event bus. Returning from estimate/sketch routes reloads the feed. Switching project,
company or session discards prior rows and ignores stale requests. Refresh must
preserve dirty forms in other mounted tabs. No Realtime, polling or background jobs
are required for v1; other users' changes appear on next load/refresh.

Start recording at rollout. Show “Activity recorded since [rollout date]” based on
a server-provided tracking-start marker, not the oldest currently visible event.
Existing projects can initially have an empty journal. Do not invent historical
creation actors or reconstruct past edits from current rows. Historical import of
existing estimate events is a separate optional migration with original timestamps,
source IDs and deduplication; it is not required for the first release.

## Checkable implementation sequence

- [x] 1. Finalize event vocabulary, source-key mapping, payload examples and actor
  fallback; record the accepted design in a new decision document at implementation.
- [x] 2. Create an additive migration using the installed CLI's documented migration
  command: activity table, tracking-start marker, grants/RLS/indexes and private
  source triggers. Keep existing source revisions and RPC contracts intact.
- [x] 3. Add rollback-only `supabase/tests/project_activity.sql`; validate triggers
  and isolation before applying to the RenvoDesk development project
  `oripsywzngftarbprlgk`. No other project, destructive reset or production changes.
- [x] 4. Regenerate `src/lib/supabase/database.types.ts` after schema changes; add
  `src/features/activity/{activity-service,activity-model,activity-copy}.ts` and
  journal components using the existing browser client and UI primitives.
- [x] 5. Integrate overview aside, Activity tab, category filters, pagination,
  independent retry and scoped refresh call sites. Preserve existing panel state.
- [x] 6. Run relevant checks and database regressions, visually verify desktop/mobile
  and both locales, then update README, AGENTS.md and DESIGN.md with actual behavior.

## Acceptance and verification

- [ ] Each matrix event persists exactly once for its successful source operation;
  failed/conflicting/no-op mutations and abandoned uploads emit no success event.
- [ ] Lost-response retries, repeated finalization/publication and estimate RPC
  replays never duplicate activity. Trigger failure rolls back the source write.
- [ ] SQL tests cover two organizations, owners, members, removed members, anonymous
  access, spoofed actor/audience/source IDs, direct writes and cross-project FKs.
- [ ] Members cannot retrieve financial rows, labels, counts or payloads even with
  crafted REST filters. Assigned-task edits and owner removal/unassignment still work.
- [ ] Deleted tasks remain readable in history; same-transaction timestamps paginate
  deterministically; tenant/category filters precede limits; account switches clear data.
- [ ] Unit tests cover FR/EN templates, unknown-event fallback, exact cents, cursor
  validation and any sketch grouping. Browser fixtures cover sidebar/full feed,
  filters, pagination, retry, independent errors, refresh after changes, missing
  targets, member views and unsaved-form preservation.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and relevant
  Playwright tests via `pnpm test:e2e`. Re-run affected rollback SQL suites for
  projects, tasks/team, costs, estimates and file/sketch publication.
- [ ] Validate real development-database writes and reads with synthetic fixtures;
  mocked browser tests alone do not establish persistence or tenant isolation.

## Later extensions, outside first release

Manual site updates (“Delivery delayed until Friday”) would complement automatic
history. Design them as a separate revisioned note domain with explicit author/edit
permissions, retry IDs and correction history. Posting by members is a new write
permission that needs an explicit product decision. Later candidates: attachments
via existing private files, daily digest, unread state, mentions and email delivery.
An actual email newsletter needs audience, SMTP and delivery decisions. AI summaries
would require additional privacy/provider decisions and are unnecessary for v1.

## Sources and planning verification

Reviewed repository README, AGENTS, current project layout plan and source, plus
estimate workflow, team and sketch migrations. Confirmed the design against official
[Supabase trigger documentation](https://supabase.com/docs/guides/database/postgres/triggers)
and [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
on 2026-09-22. The changelog markdown endpoint was attempted but the browsing tool
could not read its content type; repeat the skill's changelog check before coding.
The original proposal above is retained for traceability. Final implementation uses
entry/revision-based refresh instead of a callback context and records each sketch
revision individually. See decision 015 for deployed schema and precise boundaries.
The HTML changelog and current Supabase documentation were checked before coding;
no applicable breaking change was identified.


## Implementation verification — 2026-09-22

- `pnpm lint` and `pnpm typecheck`: passed.
- `pnpm test`: 42 tests passed across 12 files.
- `pnpm build`: passed, with existing large-chunk warnings.
- `pnpm test:e2e --workers=4`: 49 passed, one intentional desktop skip for the
  mobile-only navigation test. Six journal tests run across desktop and mobile.
- Rollback SQL: project_activity, project_editing, project_isolation,
  task_isolation, team_isolation, cost_isolation, estimate_isolation,
  estimate_workflow, file_isolation and sketch_isolation all passed on the
  development database after migration.
- Reviewed generated desktop/mobile overview and journal screenshots, including
  French member content, long labels, exact amounts and empty/error states covered
  by browser assertions. Browser data is fictional and API-mocked.
- Security/performance advisors reported no new journal findings. Existing Auth
  leaked-password protection and unrelated schema performance notices remain.

The acceptance list above remains the original detailed checklist; these actual
results, the tests and decision 015 define the verified release. No independent
real-Storage transport test or historical backfill was performed for this feature.
