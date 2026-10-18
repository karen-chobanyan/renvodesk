# Account settings layout and UX

Implement the nine approved improvements using the workspace settings composition.
Keep profile and password operations independent. Reuse the existing Auth calls;
no email changes, new roles, migrations or provider configuration changes.

1. [x] Compact account-scoped header without the workspace eyebrow.
2. [x] Shared Settings sections and responsive form widths.
3. [x] Read-only signed-in email.
4. [x] Dirty-aware profile Save/Cancel and accurate feedback.
5. [x] One leave guard covering profile edits and unfinished password changes.
6. [x] Expandable password form, with Cancel clearing and closing it.
7. [x] Accessible show/hide controls for each password field.
8. [x] Field-associated validation and first-error focus.
9. [x] Discoverable password recovery link beside current password.

Share presentation and localized copy with the fictional demo. Password operations
remain disabled there. Passwords stay in uncontrolled form inputs, are never put in
persistent storage or shared state, and clear on cancel/success/unmount. Navigation
protection has the same Navigation API/older-browser limitations as Settings.

Verify mocked profile saves/retries, independent drafts, password errors/recovery,
visibility, cancel clearing, navigation protection, keyboard focus and FR/EN/mobile.
Run lint, typecheck, build and focused browser regressions; inspect fictional images.

## Verification results

- Lint, web/API typecheck and web/API build passed. Build retains the existing
  large-chunk advisory.
- All 12 distinct focused desktop/mobile Playwright checks passed across runs,
  covering existing account/shell regressions and the new live/demo flows.
- Profile validation, retry, cancel and language changes preserve independent
  password drafts. Password field errors, visibility, clearing, recovery and one
  shared navigation prompt are covered with mocked Auth requests.
- Fictional English desktop (1440px) and French mobile (390px) screenshots reviewed;
  no horizontal overflow. Demo password disclosure focuses its enabled Cancel action.
- No live account updates or recovery emails were performed. Existing provider-side
  current-password enforcement remains a separate production verification item.
- Older browsers retain link-click/unload protection; SPA Back/Forward prompts
  require the Navigation API, as with the existing Settings guard.
