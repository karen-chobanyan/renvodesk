# Private project files

- [x] Add private bucket and project file metadata, immutable paths, owner upload/delete and member read policies.
- [x] Implement 10 MiB uploads with real progress, retry, private downloads, image/PDF previews and confirmed deletion.
- [x] Test tenant denial, upload/delete state transitions and browser flows; update docs and run checks.

Allow PDF, JPEG, PNG, WebP, plain text, DOCX and XLSX. Explicitly reject HEIC/HEIF (conversion deferred). Originals retain filename and version 1 under unique organization/project/file UUID keys. Metadata reservation precedes upload; pending/deleting states remain recoverable. No replacement, public links, malware scanning or offline/resumable claim. Signed preview URLs expire in 60 seconds. Delete bytes through Storage API only; retain tombstones to preserve immutable keys.

Live API verification passed and temporary fixtures were removed. SQL isolation tests passed. Existing Auth leaked-password warning remains; no storage-policy advisories.

PDF preview uses lazy-loaded PDF.js after native embedding failed verification. 21 unit tests; desktop/mobile flows include real canvas rendering.
