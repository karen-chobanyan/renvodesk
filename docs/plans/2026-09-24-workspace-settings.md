# Workspace settings

Status: implemented in the repository and the development Supabase project on
2026-09-24. Production deployment is pending.

## Scope

- Extend the existing company settings route into a clear workspace settings page.
- Persist a workspace default language (French or English) and editable company country (Belgium, France or Netherlands), with a separate revision to reject stale updates. Keep persistent personal language choices available; the workspace value is the fallback.
- Show EUR as the fixed financial currency, with honest copy that multi-currency financial records are not implemented. Show subscription management as a future area without prices, plans or payment actions.
- Keep contact details and current storage usage on the page. Only owners can change workspace preferences; members retain no settings navigation.

## Checks

- [x] Add an additive development migration with grants, validation, and revision enforcement. Regenerate database types.
- [x] Add rollback SQL tests for owner updates, member denial, stale revisions and invalid values.
- [x] Verify French/English and desktop/mobile settings UI, including save, conflict, reload and fixed currency.
- [x] Run lint, typecheck, unit tests and build; run focused browser tests and record limitations.

## Verification

- Development migration `20260924162408_workspace_settings.sql` applied. Generated
  database types updated. The rollback SQL test passed: owner write, independent
  contact/settings revisions, stale update denial, value constraints and
  member/anonymous denial.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (56 tests) and `pnpm build` passed.
- Focused desktop/mobile Playwright tests passed for the preferences form (2) and
  the signed-in company journey through settings, reload and sign-out (2). The
  full browser suite was not rerun; its earlier unrelated privacy-panel failures
  remain documented in the storage quota plan.
