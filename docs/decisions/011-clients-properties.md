# 011 — Reusable clients and properties

Accepted 2026-09-20. Keep the directory company-scoped and optional for project creation.

Clients store name, individual/company type, email, phone and billing address.
Properties belong to one client and store label, address, city and BE/FR/NL country.
Both support create/read/update, optimistic revisions, paginated loading and duplicate
request recovery. There are no delete grants or ownership reassignment controls.

Nullable project client/property IDs use composite foreign keys to enforce the same
organization and matching property owner. A property requires a client. Existing
project text is retained as a snapshot; choosing directory records prefills editable
project fields. Directory edits never rewrite historical project details. Existing
projects remain unlinked. Project editing preserves the original optional IDs.

The schema uses membership reads, owner writes, explicit column grants and revision
triggers. Generated Supabase types were regenerated after the applied migration.
Rollback SQL tests cover tenant/anonymous denial, invalid links, revision conflicts,
immutable ownership, validation and project snapshot preservation. Browser tests cover
contact creation recovery, property creation and linked project prefill on desktop/mobile.

Billing address is stored for future document use, not automatically included in the
current draft PDF. Imports, merging, deletion, multiple contacts per client and
project link reassignment are deferred.
