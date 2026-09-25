# Supabase setup and verification

Project: https://supabase.com/dashboard/project/oripsywzngftarbprlgk
Region: Frankfurt. The browser uses `.env.local` (ignored), with only the public
project URL and publishable key. `.env.example` is safe to commit.

## Auth dashboard settings required

In Authentication → URL Configuration for project `oripsywzngftarbprlgk`:
- Set **Site URL** to `https://renvodesk.com`. This is Supabase Auth's default
  destination, separate from the Vite build's `SITE_URL` metadata variable.
- Allow `https://renvodesk.com/auth/callback` for signup confirmation and
  `https://renvodesk.com/auth/reset` for password recovery.
- Signup from an invitation includes a validated `next=/invite/<uuid>` query on
  the callback. Allow the callback-scoped pattern
  `https://renvodesk.com/auth/callback?next=%2Finvite%2F*`, not a wildcard
  production origin. Test the actual invitation redirect after configuration.
- Retain `http://127.0.0.1:5173/auth/callback` and
  `http://127.0.0.1:5173/auth/reset` for local development on the shared project,
  with `http://127.0.0.1:5173/auth/callback?next=%2Finvite%2F*` for local
  invitation signup.
  Add equivalent `localhost:5173` entries only if that hostname is used.

On 2026-09-25 the hosted project's Site URL was still
`http://localhost:3000` and its Redirect URLs list was empty. Supabase therefore
sent the default localhost link even though the production app requests its own
`/auth/callback` URL. The six scoped redirects above and the production Site URL
were then saved and confirmed after a dashboard reload. Fresh signup and recovery
emails were subsequently tested as described below. Editing this file or
rebuilding the app does not change the hosted Auth settings.

On 2026-09-25 the user enabled custom SMTP in the hosted Auth dashboard using
their Titan mailbox. The dashboard switch remained enabled after a reload;
the user entered the password directly in Supabase, never in this repository.
The selected sender and SMTP username are `contact@renvodesk.com`, with
`smtp.titan.email` on port 465 (SSL/TLS). The dashboard conceals saved
credential fields, so delivered emails were used to verify the actual sender.
The hosted Confirm sign up and Reset password templates now use RenvoDesk
branding and French/English copy, while retaining `{{ .ConfirmationURL }}`.
Both were previewed and saved in the dashboard. The user confirmed that a fresh
signup email arrived from `contact@renvodesk.com` and its link returned to the
production app and signed them in. They also confirmed a fresh recovery email
from that sender opened the production new-password form. The password was not
changed in that check. DNS sender authentication has not been independently audited.
Public DNS on 2026-09-25 has Titan MX records, an SPF record including
`spf.titan.email`, and a DMARC quarantine policy. DKIM status still requires
checking the domain's unique selector in Titan's Email Reputation panel or the
authentication results in a delivered message.

Keep email confirmation and custom SMTP enabled. Do not disable email
verification to work around email delivery problems.

PKCE email links should be opened in the browser that initiated signup or reset.
Recovery validates the session before allowing a password update. Requests display
a generic account-existence message. Request a fresh confirmation link instead
of using a previously issued localhost link. Email links require the redirect
settings above.

The signed-in account page uses Auth user metadata for `full_name` and
`preferred_language`; these values are user-editable and must never authorize
access. Its password form sends `current_password` with the new password. Before
deploying it, enable and verify **Require current password when changing
password** in Auth password security settings. The client field by itself does
not enforce that requirement. Test a wrong current password and a successful
change with a disposable account; the mocked browser test does not prove live
Auth policy behavior. See decision 026.

## Database

Migration: `supabase/migrations/20260919205112_company_auth_foundation.sql`.
Organizations, memberships, the atomic onboarding RPC, projects and draft estimates are implemented.
Subsequent migrations add the project register and revision-checked editing.
Generated types: `src/lib/supabase/database.types.ts`; regenerate instead of editing.

`supabase/tests/company_isolation.sql` is a rollback-only integration test executed
against the development project using MCP. It seeds temporary fixture users inside
one transaction, switches DB roles/JWT claims, asserts isolation and then rolls back.
Never use these fixture users or addresses as real accounts.

## Verification boundaries

Browser tests mock Auth/Data API responses and verify UI behavior without sending
email. Live rollback SQL verifies tenant isolation. Production signup and recovery
delivery were confirmed by the user, not by automated browser tests.
No service-role secret is required or present in the frontend.

Verified on 2026-09-25: email/password signup and Confirm email are enabled in
the hosted project's Auth settings. The user confirmed a successful fresh signup
email and sign-in, plus recovery email delivery and arrival at the reset form.
Anonymous REST reads of organizations return HTTP 401. The latest security advisor check (2026-09-20) flags leaked-password protection
as disabled; configure this in Auth before production. Test users, memberships and organizations were rolled back and confirmed absent.

## Saved projects

Migration 20260920073710 adds projects with a composite organization/id primary key,
membership-based reads and owner-only inserts. API grants allow only create/read;
initial status and timestamp cannot be supplied on creation. The later editing
migration adds owner-only updates; deletion remains unavailable.
Project creation uses a stable client UUID; duplicate retries read the existing
record without overwriting it. List queries are organization-scoped and paginated.
Run supabase/tests/project_isolation.sql as a transaction; it rolls back fixtures.

## Project editing

Migration 20260920074632 adds integer revisions, a private invoker trigger and
owner-only update policies. Updates grant only name, client_name, city, address,
status and revision. Identity, organization and created_at remain immutable.
The trigger requires revision to advance by one; clients also filter updates by
the loaded revision. Zero returned rows mean conflict or unavailable access.
The UI preserves fields, blocks stale resubmission and offers an explicit reload.
A lost update response may also require reload; it never causes an automatic overwrite.
Run supabase/tests/project_editing.sql to verify edits, stale writes, validation
and tenant denial. All fixture changes roll back.

## Draft estimates

Migration 20260920081032 adds estimates with a composite project FK and RLS.
Each row holds up to 100 validated JSON lines; the invoker trigger validates the
snapshot, calculates total_cents and requires revision increments on update.
Owner clients may create drafts or update title/lines/revision only. Project links,
status, currency and authoritative totals cannot be overwritten by the browser.
Run supabase/tests/estimate_isolation.sql for rollback-only verification of exact
rounding, atomic validation, tenant links, permissions and stale writes.

Auth advisor follow-up: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Company document contacts

Migration 20260920091401 adds optional contact_address, contact_email, contact_phone
and contact_revision to organizations. Owner-only column updates and a revision
trigger protect changes. Name, country, creator and organization identity remain
unmodifiable from the browser. supabase/tests/company_contacts.sql verifies own
updates, stale writes, input validation and cross-company denial in a rollback.

## Private project files

Migration 20260920094807 creates the private project-files bucket and metadata.
Storage read/insert/delete policies reference project_files and memberships; no
storage update permission is added. Metadata state transitions verify uploaded
object metadata and object absence on final deletion. The upload policy locks the
reservation against deletion races. Metadata tombstones retain immutable paths.

supabase/tests/file_isolation.sql uses rollback-only synthetic storage metadata to
exercise RLS and transitions. No real object bytes are created by that SQL test.
A separate live test confirmed raw Storage upload, metadata finalization, exact
bytes on download, signed URLs, anonymous denial, overwrite denial and API deletion.
Temporary account, company, project, file metadata and object were removed afterward.

### Project tasks

Applied migration `20260920105333_project_tasks.sql` adds private tenant-scoped task
CRUD with composite project ownership, title/notes/status/date validation, immutable
identity and revision triggers. Types regenerated. `supabase/tests/task_isolation.sql`
passed against the connected development project in a rolled-back transaction,
covering authorized CRUD, invalid input, stale writes/deletes, cross-tenant denial,
cross-company project links and anonymous denial. Security advisor reports no new
findings; the existing leaked-password protection warning remains.

### Cost budgets and actual costs

Applied `20260920113045_project_costs.sql`; regenerated browser types. Budget and
cost tables use existing tenant membership/owner policies and same-company project
FKs. The SECURITY INVOKER `project_cost_summary` RPC returns exact totals across all
non-voided costs, independent of list pagination. `supabase/tests/cost_isolation.sql`
passed in a rolled-back transaction: writes, validation, revisions, void immutability,
retained history, aggregate totals beyond one page, tenant/FK and anonymous denial.
No new security advisor findings; the existing password-protection warning remains.

## Client directory

Migration `20260920114313_clients_properties.sql` adds clients, properties and nullable
project links. Composite foreign keys enforce organization and property/client identity.
Members read; owners insert/update editable columns with revision checks. No deletion
or project-link update grants. Run `supabase/tests/client_isolation.sql` as a rollback-only
SQL verification; it checks tenant denial, link constraints, revisions and snapshots.

## Team invitations and task permissions

Applied migration `20260920121357_team_tasks.sql` adds the member role, team invitation
RPCs and same-company task assignee FK. Member financial/directory reads are denied
by restrictive policies; project/task/file reads remain available. Direct membership
writes remain unavailable. Public invoker RPCs delegate to constrained private
functions for verified recipient matching and transactional membership changes.

Run `supabase/tests/team_isolation.sql` as a rollback-only check. It passed against
the development project. Generated types reflect the migration. Security advisors
reported no new finding beyond the existing leaked-password-protection warning.

Invitation links are copied, not emailed. They expire after seven days. Recipients
need a confirmed account with the invited email. For signup return navigation, allow
the application callback URL with its `next=/invite/<uuid>` query parameter in Auth
redirect configuration; keep the production origin and path restricted. If an email
callback drops the return parameter, reopen the original invitation after confirmation.
A localhost invitation works only on the same device; use a deployed origin for real
team testing. Existing SMTP/signup/recovery delivery limitations remain unchanged.

## Sketch storage

Migration `20260920141258_project_sketches.sql` is applied. It adds the private
`project-sketches` bucket, `project_sketches`, `sketch_saves`, and constrained
publication functions. Owners write; members read committed content. There are no
object overwrite/delete policies. Generated types are refreshed.

Run `supabase/tests/sketch_isolation.sql` only as a rollback test; its writes and
delete-denial assertions are scoped to fresh fixture users/company. Hosted Storage
blocks direct metadata deletion independently of RLS. Use Storage APIs for actual
object operations. The SQL test proves metadata/policy behavior, not byte transport.

## Estimate workflow

Migration `20260920143945_estimate_workflow.sql` is applied and generated types are
updated. `estimates.sent_snapshot` freezes sent content and contact/site details.
`estimate_events` is owner-readable with no direct client mutation grants. Use
`record_estimate_event` with an expected revision and stable request ID; never write
statuses directly. Hosted rollback tests pass in `supabase/tests/estimate_workflow.sql`.
The existing leaked-password protection warning is unchanged; no new schema security
advisor findings were reported.
