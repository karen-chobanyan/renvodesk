# PDF preview module loading fix

Cause: the application and standalone CAD Vite servers share node_modules/.vite.
The CAD optimizer replaced the cache with its own dependency set, removing PDF.js.
The saved PDF fails at dynamic module import, before any file download.

- [x] Give each Vite configuration a distinct dependency cache directory.
- [x] Remove temporary diagnostics; retain private URL/content protection.
- [x] Verify the user PDF renders with both development servers running.
- [x] Run typecheck/lint and the existing file-preview browser regression.


Results: the actual saved two-page PDF rendered in the user's browser with both
servers running (canvas data-rendered=true). Lint/typecheck pass. The existing
file-preview test reached and passed the PDF canvas assertion on desktop/mobile;
the complete mobile flow passed. The complete desktop flow later failed at sign-out
because the floating Cookie Settings button overlaps the account menu. That
unrelated layout issue was not changed. Updated this test to reject consent before
sign-in so the consent panel no longer blocks its earlier actions.
