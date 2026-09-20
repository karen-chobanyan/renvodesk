# 012 — Team invitations and assigned tasks

Status: implemented. The user explicitly approved application on 2026-09-20.

## Agreed permissions

- Owners retain existing management rights and administer invitations/team membership.
- Members view company projects, files and tasks, and edit only their assigned tasks.
- Members cannot create/delete tasks, reassign tasks, modify projects, upload/delete
  files, or administer invitations/memberships.
- Financial records (estimates, budgets, costs) and the reusable client/property
  directory remain owner-only. Existing project client/address snapshots remain visible.
- Company memberships remain isolated. No public membership-write grants are added.

## Invitation contract

Owners create a copyable link bound to one normalized recipient email, the company,
a fixed member role, and a seven-day expiry. No invitation emails are sent.
A verified, non-anonymous account matching the current auth.users email must explicitly
accept. Preview does not join the company. Acceptance is transactional and idempotent;
a consumed invitation cannot restore a removed membership. Owners may revoke pending
invitations. Removing a member revokes their invitations and clears task assignments
with revision increments in the same transaction. Owners cannot be removed through
this API, preserving existing creator-onboarding behavior.

Private SECURITY DEFINER functions perform the narrowly privileged membership and
auth-email operations. Public invoker wrappers expose them. Each function checks
identity/permissions, fixes search_path, and revokes anonymous/public execution.
The existing own-membership SELECT policy stays intact, avoiding recursive RLS.
The member directory RPC reveals email/role only within an authorized company.

## Implementation and verification

Migration: `supabase/migrations/20260920121357_team_tasks.sql`, applied to RenvoDesk.
Generated types regenerated from the hosted schema. No production dependencies added.
`supabase/tests/team_isolation.sql` passed against Supabase with rolled-back synthetic
fixtures. It verifies email identity, confirmation, expiry, revocation, replay, removal,
role administration, task assignment/revisions, financial/directory denial and file
read-versus-write permissions. This does not simulate concurrent sessions or SMTP.

The owner team page uses 50-member/20-invitation pagination. Assignee pickers support
additional pages. Task rows show a generic current-assignee label when that person is
outside the first loaded roster page. Members edit assigned tasks through the same
revision-protected editor; title, notes, status and dates may change, assignment may not.
Owner-only routes block finance, clients, settings and team pages before rendering.
The server remains authoritative if cached UI permissions become stale.

Login and signup accept only a strictly validated `/invite/<uuid>` return destination,
including through signup confirmation. Configure the callback redirect URL before
using confirmation emails. No invitation email is sent; links must use a reachable
app origin when shared with another device (127.0.0.1 is local to each device).

Browser tests use mocked Auth/Data responses for owner administration, lost-response
recovery, explicit acceptance after login, unavailable invitations, member controls,
assignment and task edits on desktop/mobile. Real invitation email delivery is not
claimed. The pre-existing leaked-password-protection advisor warning remains unchanged.
