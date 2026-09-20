# Supabase authentication and company foundation

Scope: sign-up/sign-in/sign-out, confirmation callback, password recovery, protected
company workspace, atomic company creation and membership-based read isolation.
Existing projects and estimates remain an explicitly marked independent demo.

- [x] Connect a pinned supabase-js client with publishable configuration only.
- [x] Add organizations/memberships migration, owner-only bootstrap RPC and RLS.
- [x] Verify two-tenant isolation, anonymous denial, and idempotent onboarding.
- [x] Add localized auth, recovery, company onboarding and company selection UI.
- [x] Test browser flows, failure states, lint/types/unit/build; document limits.

Decisions: owner-only initial membership; team roles/invitations deferred. Region
Frankfurt; project oripsywzngftarbprlgk. No service key in the browser. Auth redirect
allow-list and mail delivery require dashboard configuration outside available MCP.

## Results — 2026-09-20

- Lint, typecheck, build: passed.
- Unit tests: 11 passed.
- Browser tests: 17 passed; desktop execution of mobile-only drawer test skipped.
- Browser Auth/API responses are mocked; no email was sent by these tests.
- Live database rollback tests passed: own-company reads, cross-tenant denial,
  direct membership/company write denial, anonymous denial, verified-email guard,
  input constraints, and idempotent company creation.
- Live Auth settings: email enabled, signup enabled, email confirmation required.
- Live anonymous organization REST read: HTTP 401.
- Security advisors: no findings. Fixture rows confirmed absent after rollback.
- Desktop/mobile login screenshots reviewed; no page errors or viewport overflow.
- Local migration filename aligned with actual MCP migration history version.

Outstanding operational setup: dashboard redirect allow-list and real email delivery
verification. Supabase MCP does not expose Auth configuration updates. See docs/SUPABASE.md.
Project and estimate persistence remain the next domain milestone, not part of this step.
