# Draft estimate PDF export

- [x] Add optional company address/email/phone with owner-only, revision-checked updates.
- [x] Download saved FR/EN estimate PDFs with company/client/site details, lines, cents totals, draft labels and repeated page headers/footers.
- [x] Test permissions, saved-data export, dirty-state gating, accents and multi-page pagination; inspect rendered PDFs.
- [x] Update documentation and run relevant checks.

Use lazy-loaded jsPDF/AutoTable (MIT) with a local Unicode font. No external PDF service, files uploaded or customer messages sent. No tax, invoice number or acceptance claim. PDFs reflect a saved draft plus current company/project contact information, not an immutable issued document.

Verified: 19 unit tests, 17 browser tests (one intentional skip), lint/types/build and live contacts isolation passed. Rendered and inspected one-page FR and seven-page EN PDFs, checking selectable accents and totals. Existing Auth leaked-password protection warning remains.
