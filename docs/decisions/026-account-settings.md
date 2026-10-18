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


## 2026-10-18 — Account layout and edit recovery

The live and demo account screens now share the Settings section layout and
localized presentation. Signed-in email is read-only. Profile edits have dirty-aware
Save/Cancel and feedback; password editing is disclosed on demand with accessible
visibility controls, field errors/focus and a persistent recovery entry point.
Cancelling or completing a password change clears and closes its form.

Profile and password drafts remain independent through saves and language changes.
One existing unsaved-change guard covers both; native unload and link protection
remain available, while SPA history traversal protection needs the Navigation API.
The fictional demo stores profile changes only in its in-memory store and disables
password operations. Existing Supabase Auth calls and authorization boundaries are
unchanged; mocked browser checks do not verify live password policy or email delivery.
