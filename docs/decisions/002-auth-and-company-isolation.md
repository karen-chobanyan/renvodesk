# 002 — Authentication and company isolation

Supabase project: RenvoDesk (`oripsywzngftarbprlgk`), Frankfurt (`eu-central-1`).
Browser configuration uses only the publishable API key. supabase-js is pinned.

The browser uses PKCE with the SDK's session handling. Session state controls UI;
it is not an authorization boundary. PostgreSQL RLS authorizes all company reads.
Authorization never trusts user-editable metadata. A verified non-anonymous email
account is required by the onboarding function.

Initial roles: owner only. No client grants for membership writes, company updates,
or deletes. Team administration requires a future audited permission model.
Organizations may have multiple memberships and users may belong to multiple orgs.
Only the user's own memberships are readable in this initial scope.

Atomic onboarding uses a SECURITY INVOKER public RPC that delegates to a private,
non-exposed SECURITY DEFINER function with an empty search path, explicit auth.uid
and verified-user checks, input constraints, and an idempotency key. This is the
only deliberate privilege elevation. It is necessary to insert the organization
and first membership together without opening a self-escalation policy.
When adding membership removal, revisit bootstrap replay behavior: the current
idempotent call repairs the creator membership; no removal API exists yet.

Public application routes: /login, /signup, /auth/forgot, /auth/reset,
/auth/callback. /workspace requires an authenticated session. /projects and
/estimates are still isolated fictional demos, not persistent customer records.
Selecting a company in /workspace does not turn demo records into company data.

MCP cannot update Auth site/redirect configuration or SMTP. Those dashboard settings
must be completed before real email signup and recovery are considered verified.
