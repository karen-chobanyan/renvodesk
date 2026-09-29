# 030 — AI site-note hardening: retention, execution, limits and names

Date: 2026-09-29. Status: accepted; not implemented. Implementation follows
[the hardening plan](../plans/2026-09-29-ai-site-notes-hardening.md).
Extends [decision 029](029-ai-site-notes.md).

## D1 — Retention: 30 days, purged in the database

Transcripts, summaries and proposals are kept for **30 days** after an
analysis completes. After that the row stays, but its content is removed.

- The row keeps only operational metadata: status, failure reason, models,
  prompt version, usage, timestamps and requester. Quota accounting, reuse
  checks and audits still work; no transcript text remains.
- A daily `pg_cron` job in the development/production Supabase project clears
  `transcript`, `summary` and `proposal` and sets `purged_at`. RLS also hides
  content past `expires_at`, so expiry holds even if a purge run is missed.
- Content is also cleared immediately when the source file moves to
  `deleting`, via the existing private file-lifecycle trigger path. Deleting
  a recording must not leave its transcript behind.
- Tasks the owner created are normal project data and are not affected.

Why: the lasting value is the tasks the owner creates, not the transcript.
The voice note may contain workers' or customers' voices and site details.
Thirty days covers review and follow-up; the original audio remains available
through the normal file lifecycle for anyone who needs to re-listen. Enforcing
this in the database does not depend on the API process being up.

## D2 — Execution: database-backed jobs run inside the API process

`POST` records a job and returns `202` with its ID; the API runs it in-process;
the browser polls `GET` until it is `ready` or `failed`. No queue, worker
service or Redis is added.

- State lives in `site_note_analyses`. Every step moves the row forward
  (`queued → transcribing → proposing → ready | failed`) and renews
  `lease_expires_at`. Each provider call has its own timeout, and the whole
  job has a deadline shorter than the lease.
- A process restart cannot leave a job "running" forever: an expired lease is
  read as `failed` (`lease_expired`). Retrying uses a new request ID and is
  charged again, which the UI states.
- Global concurrency is capped in-process (`AI_MAX_CONCURRENT_JOBS`, default
  4). Excess jobs stay `queued` and start when a slot frees. Queued jobs are
  not taken over by another process; if the API is scaled beyond one
  instance, adopt a claimed-lease worker at that point.
- The browser polls every 2 s, backing off to 5 s, and stops after 4 minutes
  or when the component unmounts. Leaving the page does not cancel or lose the
  job: the saved result can be reopened.

Why: this removes long-held HTTP requests and proxy timeouts, survives
reloads and restarts, and lets results be reused. It uses only the existing
Fastify process and Postgres, as the rule to avoid speculative
infrastructure requires.

## D3 — Result writes use the owner's token; no service role

The API keeps using the caller's token and the publishable key. Job and result
writes go through public SECURITY INVOKER wrappers around constrained private
SECURITY DEFINER functions (the onboarding pattern). No service-role key or
direct database credential is added to the API.

Accepted consequence: an owner could call these functions from their own
browser and store a fabricated "analysis" for their own company. This is
tolerable because:

- results are visible only to that company's owners, which is the same
  person who could write them;
- results never authorize anything and never create tasks. Task creation
  remains an explicit owner action through normal task RLS;
- quota is charged when a job starts and no client-callable function refunds
  it, so bypassing the API cannot inflate someone's allowance;
- functions allow only legal state transitions, terminal rows are immutable,
  and every call checks owner membership and company/project/file scope.

Revisit this before results are shown to members or customers, used as
evidence, or used for billing. At that point, add a narrowly scoped
server-only write path.

Why: a privileged credential on the API would widen what a compromised API
host can do across all companies, for little integrity gain in an owner-only,
advisory feature.

## D4 — Limits: opt-in per company, counted by analyses started

| Limit | Default | Where enforced |
| --- | --- | --- |
| Company enabled | **off** until an operator enables it | private entitlement table, checked in `begin…` |
| Running jobs per user | 1 | `begin…` (a queued or running row blocks another) |
| Analyses per company per day | 30 (Europe/Brussels day) | private counter, `begin…` |
| Analyses across all companies per month | 2,000 | private counter, `begin…` |
| Concurrent jobs per API process | 4 | in-process semaphore |

- Defaults live in a private settings table so they can be changed without a
  deploy. The operator can raise a company's daily limit individually.
- A reused `ready` result costs nothing and is not counted. Every job that
  starts is counted, including failed ones, because the provider may already
  have charged. Refunds would also create a client-callable bypass (see D3).
- An exhausted limit returns `429` with `limit: "company_daily" | "global_monthly"
  | "user_running"`. The UI shows remaining analyses from `site_note_ai_status`.
- The existing 10 MiB / five-minute recording cap bounds the cost of each
  analysis, so counting analyses is a sufficient budget proxy for now.

Why: opt-in is the safe default for a paid, data-sharing feature. A per-user
running limit stops repeated clicks, the daily company limit bounds any one
customer, and the global monthly cap bounds total spending. All of these
counters are durable and cannot be reset by a restart.

## D5 — Names: no team roster is sent; people are matched on the server

Team names **are not sent** to the provider. This replaces the interim
opaque-key approach from 2026-09-29, which sends e-mail local parts.

- The tool schema asks for `assigneeMention`: the person's name exactly as
  spoken in the transcript, or null. The server checks that the mention
  occurs in the transcript, using the tolerant matching from #6.
- The server matches the mention against the company's team using display
  names from Account settings, falling back to the e-mail local part. Matching
  ignores accents and case and accepts either the full name or a unique first
  name. No match or several matches → no assignee.
- The review shows the mention, e.g. "Mentioned in the note: Marc", next to
  the assignee field whenever it could not be resolved to exactly one
  person, so the owner chooses.
- A new owner-only read returns `user_id` and display name for matching.
  Display names are metadata, never authorization data.

Why: data minimization. The provider already hears whatever names are spoken.
Sending the roster would disclose everyone else on the team, on every
request. Matching on the server is deterministic, testable, and refuses to
guess when a name is ambiguous. That makes it more reliable than letting
the model pick from a list.

## Consequences

- New migration, rollback SQL tests and regenerated types (Phase 1). `pg_cron`
  becomes the first scheduled database job in this project.
- The request/response contract of the analysis route changes (`202` + polling).
- Privacy pages must state the 30-day retention and the provider as a processor
  before any company is enabled.
- Decision 029 remains the description of the current, synchronous behavior until
  Phase 1 ships.
