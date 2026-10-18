# Team and estimate editor UX

- [x] Share compact Team header, member rows and invitation grouping across live/demo; show loaded counts and contextual empty/error states.
- [x] Move invitation creation/link retrieval into a focused, guarded dialog preserving existing request recovery, permissions and manual sharing.
- [x] Give live/demo estimate editors a compact contextual header and sticky save/status/PDF actions; separate editing, tracking and history.
- [x] Make estimate lines readable/editable on phones without horizontal scrolling and preserve exact decimal calculations and frozen states.
- [x] Protect unsaved estimate edits on navigation/reload without changing the routing foundation.
- [x] Complete FR/EN copy, docs and focused desktop/mobile workflow tests; visually verify with fictional data.

No schema, authorization, PDF rendering, financial calculation or email delivery changes. Live data verification is read-only.

Verification:
- `pnpm lint`: passed (239 files).
- `pnpm typecheck`: passed for web and API.
- `pnpm test`: 114 passed across 25 files.
- `pnpm build`: passed (existing large-chunk advisory).
- 31 focused desktop/mobile Playwright checks passed across the final focused
  runs; one existing mobile PDF-viewer check intentionally skips. Coverage includes
  invitation retries and focus, removal/revocation, independent list failures and
  pagination, draft save/conflict recovery, recorded decisions and frozen PDF
  snapshots, layout bounds, FR/EN, long descriptions, sticky controls, and canceled
  link/Back/Forward/reload navigation. The large sign-in scenario emits existing
  connection-refused logs for the optional local AI API; its assertions pass.
- Inspected desktop and mobile demo Team/editor layouts and the invitation dialog.
  Screenshots contain fictional data. Live editor verification is read-only.
- No database schema, permissions, financial models or PDF layout changed.

Compatibility: Back/Forward protection uses cancelable same-document events from
Navigation API. Older browsers without that API retain link and unload prompts;
they do not receive SPA history traversal protection. Browser prompts remain
subject to browser user-activation rules. Inputs are memory-only.

