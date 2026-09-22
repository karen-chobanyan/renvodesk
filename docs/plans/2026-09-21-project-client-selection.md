# Project client selection
- [x] Require an explicit saved client selection in project creation.
- [x] Allow creating a client in a dialog and select it immediately without losing project fields.
- [x] Preserve optional existing-property selection; verify client creation and project linkage.

## Inline details revision
- Replace the client dialog with an inline contact form and Save client action.
- Autofill all existing-client details, read-only to protect shared records.
- Keep retry identifiers stable after uncertain saves.

## Single-save revision
- Always-visible contact fields and one dropdown; no search or separate client-save action.
- New clients are saved during project submission with a stable retry identifier; existing clients are reused.
- Saved-client details stay read-only; manual drafts survive switching between clients.
