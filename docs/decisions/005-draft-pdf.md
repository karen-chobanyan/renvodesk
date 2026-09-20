# 005 — Draft estimate PDF export

Use browser-side jsPDF 4.2.1 with AutoTable 5.0.8 (MIT), loaded only on export.
A local Noto Sans font (SIL OFL) supports French/English text, accents and euro signs.
No PDF backend, storage upload or email transport is introduced.

The export button is disabled for unsaved fields and failed/conflicting saves.
Before export, reread the estimate, organization and project with existing RLS.
Require the saved estimate revision to equal the displayed revision; otherwise ask
for reload. Totals are verified against the persisted lines and displayed with exact
integer cents, including very large supported values. Every page is visibly Draft.

Company address/email/phone are optional fields, owner-editable with a separate
contact revision. PDFs use current company and project information. This is a
convenience export of a draft, not a legal or immutable issued-document snapshot.
Tax, sending, acceptance, document numbering and PDF archival remain future work.
