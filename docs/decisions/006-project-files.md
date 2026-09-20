# 006 — Private project files

Use Supabase Storage with a private project-files bucket, 10 MiB limit and a small
allowlist: PDF, JPEG, PNG, WebP, TXT, DOCX, XLSX. Explicit HEIC/HEIF rejection avoids
pretending browsers can preview or convert unsupported originals. MIME/extension
validation is not malware scanning. Documents are untrusted; only image/PDF previews
are embedded. PDF.js 6.3.289 (Apache-2.0) renders pages on a bounded canvas in a
worker, without interactive scripts, forms or links. Native PDF frames were rejected
after a blank-preview/focus failure in browser verification. A download fallback
remains available for documents the renderer cannot display.

Reserve a metadata row before uploading. Immutable keys are generated from company,
project and file UUIDs. The composite project FK prevents tenant mismatch. Owner-only
upload authorization locks the reservation FOR SHARE inside the storage transaction;
state updates wait for upload completion before deletion proceeds. Files cannot be
overwritten; future revisions need new objects and an explicit version model.

States are pending, ready, deleting and deleted. Finalization checks actual object
size/MIME. Delete marks metadata first, removes bytes through Storage API, then keeps
a deleted tombstone. Failed operations stay visible for recovery, rather than leaving
untracked objects. There is no background janitor yet. Owners may clean up pending
uploads; interrupted sessions do not imply offline or resumable upload support.

Member reads are protected by RLS. Preview links last 60 seconds and are removed
from the UI after 55 seconds; issued links may remain usable until expiry. Downloads
use authenticated blob requests. No public sharing, generated thumbnails, revision
history or automatic backup pipeline is introduced in this milestone.
