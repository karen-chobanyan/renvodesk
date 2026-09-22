# Navigation sidebar cleanup

Scope: simplify the live application's existing navigation without changing routes,
company/role permissions, brand, fonts or demo data boundaries.

- [x] Keep brand, company selector, Projects/Clients/Schedule/Estimates and account.
- [x] Remove the redundant workspace heading and Resources/Components section from
  the live sidebar; the existing footer still links to the design system.
- [x] Remove repeated connected-workspace captions and the saved-project explainer.
- [x] Move Explore demo into the account disclosure and close the mobile drawer on
  navigation. Keep explicit demo notices on fictional demo screens.
- [x] Verify company selection, sign-out, owner/member navigation and keyboard/mobile
  behavior using existing browser flows; inspect desktop/mobile screenshots.

Verified: lint/typecheck passed; targeted desktop/mobile navigation suite passed
11 tests with one intentional desktop skip. Reviewed the rendered desktop sidebar.
