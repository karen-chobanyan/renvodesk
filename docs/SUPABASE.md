# Supabase setup and verification

Project: https://supabase.com/dashboard/project/oripsywzngftarbprlgk
Region: Frankfurt. The browser uses `.env.local` (ignored), with only the public
project URL and publishable key. `.env.example` is safe to commit.

## Auth dashboard settings required

In Authentication → URL Configuration:
- Development site URL: `http://127.0.0.1:5173`
- Allow `http://127.0.0.1:5173/auth/callback`
- Allow `http://127.0.0.1:5173/auth/reset`
- If using localhost, add the exact equivalent localhost routes too.
- Before deployment, add the actual HTTPS application origin and callback/reset
  paths. Do not allow broad production wildcard redirects.

Keep email confirmation enabled. Configure a suitable SMTP provider before inviting
real customers; built-in Supabase email delivery has restrictions. Do not disable
email verification to work around email delivery problems.

PKCE email links should be opened in the browser that initiated signup or reset.
Recovery validates the session before allowing a password update. Requests display
a generic account-existence message. Email links require the redirect settings above.

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
email. Live rollback SQL verifies tenant isolation. No real signup/confirmation or
recovery-email delivery is claimed until the dashboard settings and SMTP are verified.
No service-role secret is required or present in the frontend.

Verified: email/password signup is enabled and automatic email confirmation is off.
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
