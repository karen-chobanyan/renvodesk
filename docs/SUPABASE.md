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
Only organizations, memberships and the atomic onboarding RPC are implemented.
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
Anonymous REST reads of organizations return HTTP 401. Security advisors report no
findings. Test users, memberships and organizations were rolled back and confirmed absent.
