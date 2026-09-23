# 013 — Private project sketches

Excalidraw 0.18.1 (MIT) provides quick drawing and raster-image annotations. The
editor is lazy-loaded, uses self-hosted fonts, and supports French and English.
Detailed measured planning remains a separate future module.

Each project has multiple titled sketches. `project_sketches` holds the current
revision; `sketch_saves` stores immutable per-save metadata, source/preview paths,
sizes and SHA-256 hashes. The private `project-sketches` bucket contains JSON scene
bundles with embedded assets and PNG previews. Composite FKs enforce company and
project identity. Owner-only publication locks the sketch and reservation, checks
the loaded revision and both Storage objects, and advances the pointer atomically.

Owners create/edit/restore; members read committed revisions. There are no object
update/delete policies or direct metadata mutation grants. Pending reservations
are owner-visible only. Client-side hashes verify downloaded and retried bytes;
the publication function verifies MIME/size metadata, not the file contents.

Autosave is debounced and serialized. Failed attempts retain their exact UUID and
bytes for retry. Conflicts pause saving and offer export/reload. Old revisions open
read-only; restoring creates a new revision. Local drafts are memory-only, with
beforeunload protection. History errors must not unmount or discard an editor.

Project sketch lists, overview previews and activity open a large modal in place;
the project page and its working forms stay mounted. Revision selection and restore
load into that modal without changing the URL. Closing or switching revisions
requires confirmation when edits are pending, while beforeunload still protects
real page exits. Existing sketch URLs remain usable as direct links. Desktop
history sits beside the canvas, while phone history docks below it. Excalidraw
keeps its drawing tools, and save/import/export controls stay in the modal header.

Limits: 2,000 elements, 8 MiB JSON including PNG/JPEG/WebP assets, 1 MiB preview.
No external embeds/links, realtime collaboration, offline sync, measured CAD,
PDF-page background rendering or deletion. Abandoned pending uploads have no
automatic cleanup yet. Backups must cover Storage bytes as well as database rows.

Verification: hosted rollback SQL tests cover publication, missing objects, retry,
conflicts, owner/member/outsider/anonymous boundaries. Browser tests exercise real
editor/service code against mocked APIs on desktop/mobile; they do not prove live
Storage HTTP transport. Existing leaked-password protection warning is unchanged.
