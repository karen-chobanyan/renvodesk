# Project sketches with Excalidraw

- [x] Inspect project/file/role boundaries and verify Excalidraw compatibility/license.
- [x] Add private immutable scene bundles and PNG previews, revision metadata and atomic conflict-checked publication.
- [x] Integrate lazy-loaded FR/EN Excalidraw, autosave/manual retry, local export, read-only member access and revision viewing/restoration.
- [x] Add project sketch list and replace fictional sketch entry points with real navigation.
- [x] Verify SQL/Storage isolation, image persistence, save recovery/conflicts, desktop/mobile interaction, and build.
- [x] Update documentation and implementation boundaries.

Owners create/edit; members view. Multiple titled sketches per project. Every saved
revision is an immutable JSON bundle containing scene and embedded raster images,
plus a PNG preview, in a private sketch bucket. Postgres stores identity, version,
size and hash metadata and the current revision pointer. Publication verifies both
objects and matches the loaded version in one transaction. No overwrites or deletion
of prior revisions; incomplete uploads remain private and retryable.

Autosave is debounced and serialized. Failed requests preserve the exact pending
snapshot for retry; conflicts pause saves until explicit reload or local export.
No realtime collaboration, measured CAD, PDF background import, or offline sync.

## Verification

The user explicitly approved the migration, applied as
`20260920141258_project_sketches.sql`. Generated types are refreshed. Hosted rollback
isolation tests pass after restricting denial assertions to fixture records.
The application now includes project entry points, private persistence, real PNG
previews, history viewing/restoration, and owner/member UI. Browser tests exercise
the actual route/service using mocked Storage; real HTTP uploads remain a manual
acceptance check. Existing leaked-password protection warning remains unchanged.
