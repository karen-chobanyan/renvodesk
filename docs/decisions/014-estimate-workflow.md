# 014 — Owner-recorded estimate workflow

The first estimate lifecycle is Draft → Sent → Accepted or Declined. Company owners
record external communication using a reference note and explicit confirmation. No
email transport, public sharing, customer signatures, invoices, or automated project
financial changes are introduced. Entry timestamps are not delivery/signature dates.

The existing estimate row retains its identity and exact totals. On sending, the
server captures title, lines, total, source revision and company/client/site details
in `sent_snapshot`. Database triggers prevent sent content from changing. PDFs use
this snapshot, with an explicit owner-recorded status; draft PDFs still use current
contacts and a Draft marker. Empty drafts cannot be sent.

`estimate_events` records actor, server timestamp, from-revision/status, target state
and required reference note. Owner-only RLS permits reading; no direct client writes
are granted. A public invoker wrapper calls a private constrained definer function
that checks ownership, locks the estimate, verifies request identity and expected
revision, then inserts the event and transitions the estimate atomically.

Retries retain UUID, revision, target and note. Replay returns current state without
duplicating events; conflicting edits or transitions require reload. Pending
transitions lock draft edits until retry/reload. Accepted/declined states are terminal.
Corrections/reopening and duplicate-as-new-draft are future workflow additions; users
can create separate drafts. Financial access remains owner-only.

Verification: local and hosted rollback tests cover exact totals, frozen snapshots,
invalid/empty transitions, duplicate requests, stale decisions, immutable history,
and owner/member/outsider/anonymous isolation. Browser tests cover both decisions,
lost-response recovery, reload, PDF source isolation and conflicts on desktop/mobile.
French/English PDF fixtures were extracted and visually reviewed.
