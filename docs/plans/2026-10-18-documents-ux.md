# Documents tab layout and UX

Implement the ten approved improvements in live and fictional FR/EN views. Preserve
private file access, upload UUID recovery, quota accounting, sketch revisions,
preview expiry and explicit AI disclosure. No schema or permission changes.

- [x] Restore the centered uploader and outlined photo/voice controls; remove duplicate header upload.
- [x] Selected-file details, Change/Remove, local progress/errors and explicit upload.
- [x] Compact, independently sized sketch column and contained previews.
- [x] Readable shared file rows, type icons, metadata and loaded counts by the heading.
- [x] Contextual voice-note AI disclosure before analysis.
- [x] Shared new-sketch dialog with guarded draft, retry identity and focus restoration.
- [x] Consistent preview/download/menu actions in live and demo.
- [x] Protect selected files, captured media and sketch drafts against unintended loss.
- [x] Return/write refresh and independent read/load-more/action errors retaining pages.
- [x] Purposeful empty states and mobile layout, demo parity and design documentation.

Verify mocked upload/retry/delete/preview/AI flows, draft guards, sketches, pagination
and independent errors. Inspect fictional FR/EN desktop/mobile screenshots. Run
lint, typecheck, relevant browser/unit tests and build (after browser tests).

## Verification

- Inspected fictional FR/EN desktop and mobile screenshots; no horizontal overflow.
- New Documents coverage exercises retained pagination, independent read failures,
  selected-file and navigation guards, failed upload request identity, guarded
  sketch creation/retry, demo parity and delayed preview navigation
  (10 desktop/mobile cases).
- Upload, preview, deletion, media capture and sketch-storage focused regressions
  passed with the new cases: 12/12. Background recording stops device tracks and
  retains captured audio for review in the expanded media regression.
- Unit tests: 114 passed across 25 files. Lint and web/API typecheck passed.
- Surrounding project/demo/DXF/member/AI regression run: 80 passed, 2 skipped;
  four stale test expectations updated for the restored chooser and closed menus.
  Final rerun: all 14 passed (10 Documents cases plus 4 corrected regressions).
  Existing mobile skips cover the desktop sidebar and duplicate PDF demo viewer check.
- Production web/API build passed, including FR/EN landing prerendering. Vite
  reports its existing large-chunk warning for bundled editor/CAD dependencies.

All browser data and requests are mocked or fictional. No live uploads, AI calls,
schema changes or permission changes were made. Browser checks do not establish
live storage policy or tenant-isolation correctness.
