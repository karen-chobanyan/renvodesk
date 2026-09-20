# 003 — Saved project editing

The live register opens /workspace/:organizationId/projects/:id. Owner users may
edit name, client name, city, address and status. The three statuses are planning,
active and completed; all transitions are permitted at this stage. Status is
operational only, with no financial approval or invoicing side effects.

Use optimistic concurrency: an integer revision is loaded with the project, then
an update matches the organization, project ID and that revision. A private invoker
trigger requires the revision to increase by one. The database serializes competing
updates, so a stale update returns no row. RLS applies to both existing and new rows;
column privileges prevent moving projects or modifying their identity/timestamp.

The UI retains fields on failure/conflict and explicitly reloads before a fresh
edit. It does not merge changes, force overwrite, autosave or persist unsaved drafts
across navigation. A lost response can produce a conservative conflict on retry;
reloading is the recovery path. Deletion and version history remain unimplemented.
