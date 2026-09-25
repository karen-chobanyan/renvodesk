# 026 — Personal account settings

Account settings live at `/workspace/account` in the protected live shell. The
route is account-scoped and available to owners and members regardless of the
selected company. Workspace Settings remains company-scoped and owner-only.

The account's full name and preferred FR/EN language are stored in Supabase Auth
user metadata via `auth.updateUser`. Metadata is display/preference data only;
never use it for authorization. A saved personal language overrides the workspace
default on session load. Until a personal preference is saved, the existing
workspace default and local language behavior remain in effect. The account
disclosure links to this page; language is changed here rather than in the menu.

Changing a password uses a separate form with current password, new password,
and confirmation. The client sends `current_password` and `password` to Supabase
Auth, does not retain the password in application state, and clears fields after
success. Before production release, enable and verify Supabase Auth's **Require
current password when changing password** setting; the client field alone does
not enforce it. If secure password change requires an additional nonce, the
page directs the user to email recovery. No custom password endpoint or schema
migration is introduced.
