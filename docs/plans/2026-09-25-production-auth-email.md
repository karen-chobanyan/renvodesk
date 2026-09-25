# Production auth email redirects

The hosted RenvoDesk Supabase project had `http://localhost:3000` as
its Site URL and no Redirect URLs. Signup already supplied an origin-relative
`/auth/callback` URL, but Supabase falls back to the localhost Site URL because
the production callback is not allowed.

1. [x] Keep the app's origin-derived signup and recovery redirects; add a browser
   regression check for their exact destinations, including an invitation return.
2. [x] Set the hosted project's Site URL to `https://renvodesk.com` and allow only
   the production callback/reset paths plus development paths actually used. Use a
   callback-scoped pattern for the encoded invitation `next` query; do not allow
   arbitrary production origins.
3. [x] Verify fresh signup and password-recovery emails from the live origin in
   the same browser that initiated each PKCE request. Confirm the link returns to
   the app, establishes a session for signup, and reaches the password form for
   recovery. Do not reuse previously issued links. The user confirmed a fresh
   signup email from `contact@renvodesk.com` returned to the production app and
   signed them in. They also confirmed a fresh recovery email from the same
   sender opened the production new-password form. They did not change the
   password as part of this check.
4. [x] Configure custom SMTP and branded FR/EN signup/reset email templates.
   The user entered the SMTP password directly in Supabase. The enabled switch,
   templates and their previews were verified after saving. The user confirmed
   delivery and sender identity for fresh signup and recovery messages. DKIM
   authentication remains a separate mail-domain check.

No database migration or service-role key is needed for the redirect repair.
