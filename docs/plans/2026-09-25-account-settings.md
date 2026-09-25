# Dedicated account settings

1. [x] Add a protected `/workspace/account` page in the persistent live shell,
   reachable from the account disclosure for every member.
2. [x] Save validated full name and preferred FR/EN language in Supabase Auth
   user metadata. Apply the saved language when the account session loads, while
   retaining the workspace default when no personal preference exists.
3. [x] Add a separate password form with current password, new password and
   confirmation. Submit through Supabase Auth; never store passwords in app state
   longer than the form needs or log them.
4. [x] Verify desktop/mobile navigation, metadata saving, language persistence,
   password success/errors, and relevant build checks.
