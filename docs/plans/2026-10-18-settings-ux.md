# Settings layout and UX

Implement the ten approved improvements, retaining the existing company settings
permissions, independent contact/preferences revisions and fixed EUR currency.
Company name editing, logos and estimate defaults are deferred.

## Approved changes

1. [x] Compact shared Settings header, company context and description.
2. [x] Full workspace width with readable form fields and consistent sections.
3. [x] Order: expanded document contacts, workspace preferences, storage.
4. [x] Multiline address and telephone input with appropriate autocomplete.
5. [x] Explain workspace vs. personal language and link to Account settings.
6. [x] Show fixed EUR as compact read-only information.
7. [x] Separate dirty-aware Save/Cancel/status, with preserved drafts on failure.
8. [x] Guard navigation and conflict reload; pin each draft to its loaded revision.
9. [x] Company-first storage, shared allowance/reservation explanations and Refresh.
10. [x] Replace Subscription placeholder with working Team and Account links.

Live and demo reuse layout, forms, FR/EN copy and storage presentation. Demo writes
stay in memory. Background organization reads cannot replace form drafts or silently
advance their revisions. Successful explicit reload and Cancel restore keyboard
focus to the first field. A failed reload preserves inputs and conflict state.

The existing estimate Navigation API + beforeunload guard is shared through a
library hook. One page-level guard covers both forms. Browsers without Navigation
API retain link/unload protection; SPA Back/Forward protection requires that API.
No migrations, new settings fields, dependencies or live data writes.

## Verification

- Lint and web/API typecheck pass.
- Web/API production build passes (existing large-chunk advisory).
- 22 focused desktop/mobile browser checks pass: Settings save/cancel/conflicts,
  failed reload and retry, background refresh preservation and pinned revision,
  one prompt for two dirty sections, link/Back/reload protection, storage recovery,
  keyboard navigation, FR/EN demo persistence, workspace shell/cache and existing
  account and onboarding flows. Two relevant checks also rerun after adding explicit
  focus restoration for Cancel and successful conflict reload.
- Initial test failures were fixture assumptions: personal language source must be
  `manual`; canceled history navigation must not wait for a page load. Corrected.
- Existing comprehensive auth checks log connection refusal for the optional local
  AI API at port 3001; assertions pass. No AI feature or backend changes here.
- Desktop English (1440px) and mobile French (390px) fictional screenshots inspected;
  no horizontal overflow. Final images in `/private/tmp/renvodesk-settings-desktop.png`
  and `/private/tmp/renvodesk-settings-mobile.png`.
- No live saved-data changes or database isolation claims. Browser writes are mocked.
