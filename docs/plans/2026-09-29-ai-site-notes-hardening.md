# AI site notes: hardening and quality plan

Follow-up to decision 029 and the 2026-09-29 architecture review. Items are
numbered as in that review (#1–#16). Each phase ships separately with its own
checks; nothing here is implemented yet.

## Decisions (recorded in decision 030)

- [x] **D1 Retention:** 30 days. After that, a daily `pg_cron` job clears
      transcript, summary and proposal and keeps the metadata. RLS hides
      expired content as a backstop. Content is also cleared when the source
      file is deleted.
- [x] **D2 Execution:** database-backed jobs run in the API process. `202`
      and polling; leases turn jobs orphaned by a restart into `failed`; 4
      concurrent jobs per process. No queue or worker service.
- [x] **D3 Writes:** the owner's token and constrained RPCs; no service role.
      A self-fabricated, owner-only result is an accepted risk; no
      client-callable refunds. Revisit before results reach non-owners.
- [x] **D4 Limits:** opt-in per company; 1 running job per user; 30 per
      company per day; 2,000 per month globally; every started job counts;
      reused results are free; `429` with the limit name.
- [x] **D5 Names:** no roster is sent. The model returns the verbatim
      `assigneeMention`; the server matches it to exactly one team member or
      leaves the task unassigned and shows the mention.

## Phase 0: quick fixes (no schema change)

Prerequisite: commit the current uncommitted assignee/date suggestions and
`apps/api/prompts/site-note-instructions.md` extraction as their own change.

- [ ] **#6 Tolerant evidence matching.** Add `normalizeForMatch` in
      `apps/api/src/site-note-analysis.ts`: NFC, curly→straight quotes and
      apostrophes, collapse whitespace, lower-case (`toLocaleLowerCase`), trim
      trailing punctuation. Compare normalized evidence to the normalized
      transcript, but return the model's original evidence text.
      Tests: `’` vs `'`, double spaces, case, line breaks, a real mismatch
      still omitted.
- [ ] **#15 Close guard.** In `site-note-review.tsx`, when any suggestion is
      unsaved and not yet attempted, closing (button, Escape, overlay) asks
      for confirmation in FR/EN, matching the task editor's unsaved warning.
      Playwright: close with pending suggestions → confirm dialog; cancel keeps
      the review; confirm closes it.
- [ ] Verify: `pnpm lint`, `pnpm typecheck`, `pnpm test`, targeted Playwright
      AI test (desktop and mobile).

## Phase 1: production readiness (#1–#4, #12 versioning)

Implements D1–D4 from decision 030.

### Schema (`supabase/migrations/<ts>_site_note_analyses.sql`)
- [ ] `public.site_note_analyses`: `organization_id`, `id`, `project_id`,
      `file_id`, `request_id` (unique per organization), `requested_by`,
      `status` (`queued` → `transcribing` → `proposing` → `ready` | `failed`),
      `failure_reason`, `transcription_model`, `proposal_model`,
      `prompt_version`, `transcript`, `summary`, `proposal jsonb`,
      `omitted_task_count`, `audio_bytes`, usage columns (tokens, audio
      seconds when reported), `lease_expires_at`, `created_at`,
      `completed_at`, `expires_at` (completion + 30 days), `purged_at`.
- [ ] D1 purge: enable `pg_cron`; a daily private function clears content
      past `expires_at` and sets `purged_at`. Extend the private
      `project_files` lifecycle path so a move to `deleting` clears the
      content of analyses for that file in the same transaction.
      PK `(organization_id, id)`; FK `(organization_id, file_id)` →
      `project_files`; FK `(organization_id, project_id)` → `projects`, plus a
      check that the file belongs to the project inside the RPC.
- [ ] RLS: owners of the organization can select unexpired rows. No direct
      insert/update/delete grants.
- [ ] Private SECURITY DEFINER functions with public SECURITY INVOKER wrappers
      (existing onboarding pattern), each checking owner membership and exact
      scope, with an empty `search_path`:
      - `begin_site_note_analysis(org, project, file, request_id,
        prompt_version, models)`: returns an existing reusable `ready` row
        for the same file/prompt/models, otherwise enforces D4 limits, charges
        quota and inserts `queued`. The same request ID returns the same row;
        a changed argument set is rejected.
      - `advance_site_note_analysis(org, id, status, lease)`,
        `complete_site_note_analysis(org, id, result…)`,
        `fail_site_note_analysis(org, id, reason)`: legal transitions only;
        terminal rows are immutable.
- [ ] Private quota tables (D4): per-company daily counter (Europe/Brussels
      day), global monthly counter, `private.ai_site_note_settings`
      (defaults 30/day, 2,000/month) and `private.ai_site_note_entitlements`
      (enabled flag and optional daily override; operator-managed, no client
      grants). `begin…` also rejects a second queued/running job per user.
- [ ] `site_note_ai_status(org)` read RPC: enabled flag and remaining daily
      quota for the owner UI.
- [ ] Rollback SQL test `supabase/tests/site_note_analyses.sql`: owner
      read/write via RPCs; member and other-company denial; cross-project
      file rejected; idempotent begin; illegal transitions rejected; each
      limit exhausted; disabled company; reuse not counted; expired content
      hidden and purged; file deletion clears content. Regenerate database types.

### API
- [ ] `POST …/files/:fileId/ai-analysis` takes `{ requestId }`, calls
      `begin…`, returns `200` with a reused ready result or `202 { id }`.
      `GET …/ai-analyses/:id` returns status or result.
- [ ] `apps/api/src/site-note-jobs.ts`: in-process runner with a global
      semaphore (env `AI_MAX_CONCURRENT_JOBS`), per-step `AbortSignal`
      timeouts, an overall job deadline shorter than the lease, and status
      advances between steps. On restart, expired leases read as `failed`
      (`lease_expired`) and can be retried with a new request ID.
- [ ] Model IDs and the global switch come from config (`AI_TRANSCRIPTION_MODEL`,
      `AI_PROPOSAL_MODEL`, allowlisted). `prompt_version` = first 12 hex
      characters of the SHA-256 of the prompt file, computed at startup.
- [ ] #4 Logging: enable the Fastify/pino logger with redaction of
      `authorization`, bodies and query strings. Per job, log request ID,
      analysis ID, reason code, step durations, usage, models and
      prompt version; never transcripts, audio, emails, tokens or URLs.

### Browser
- [ ] `site-note-ai-service.ts`: stable request UUID per click-through (kept
      across retries), post, then poll with backoff until
      `ready`/`failed`, abortable on unmount.
- [ ] `project-files.tsx`: show progress by status, the remaining quota, and
      "Open saved analysis" for files with a ready result (no new charge).
      Hide the action when the company is not enabled.
- [ ] Decision 029, `docs/API.md` and AGENTS.md updated; retention stated
      in the privacy page copy.

### Verification
- [ ] API unit tests (Fastify `inject`) for 200/202/polling, reuse, quota
      exhaustion (429), disabled company, lease expiry and log redaction.
- [ ] SQL rollback tests pass against the development project only.
- [ ] Playwright: queued → ready, reopen saved analysis without a new
      request, failure and retry, quota message. Desktop and mobile.

## Phase 2: suggestion quality (#7–#12)

- [ ] **#12 Evaluation set first.** `apps/api/evals/site-notes/*.json`:
      15–20 fictional FR/EN transcripts (no real people or customers) with
      expected tasks, assignees and dates. Script
      `pnpm --filter @renvodesk/api eval:site-notes` runs only the proposal
      step against the real provider when explicitly invoked with a key; not
      in CI. Report task recall, assignee exact match, date exact match and
      invented-field rate. Record a baseline before changing prompts.
- [ ] **#11 Split the analyzer** into `Transcriber` and `TaskProposer`
      interfaces. The job runner can then rerun only the proposal for a
      stored transcript when `prompt_version` changes.
- [ ] **#7 + #8 Per-field evidence and server-side name matching (D5).**
      Replace the opaque `member_N` keys with `assigneeMention` and add
      `dateEvidence` (both nullable, verbatim, verified with the #6 match).
      Stop sending the team roster to the provider. Add an owner-only read of
      `user_id` and display name (falling back to the e-mail local part). Match
      ignoring accents and case, by full name or a unique first name;
      zero or several matches → unassigned. The review marks prefilled
      fields "Suggested by AI" and shows the quotes, and "Mentioned in the
      note: …" when a name did not resolve. Update the prompt file and
      decision 029. Tests: exact, accent-insensitive, first-name, ambiguous,
      absent mention, mention not in the transcript.
- [ ] **#9 Company time zone.** Derive "today" on the server from the company
      country (BE → Europe/Brussels, FR → Europe/Paris, NL →
      Europe/Amsterdam) and remove the `today` request field.
- [ ] **#10 Transcription hints.** Optional "Recording language" select
      (automatic by default), and a short prompt of renovation vocabulary.
      No team names (D5).
- [ ] Verify: eval results do not regress compared with the baseline; unit and browser
      tests as in Phase 0.

## Phase 3: workflow (#13, #14, #16)

- [ ] **#13 Provenance.** Add `source_file_id` and `source_analysis_id` to
      `project_tasks` with same-company FKs, insert-only grants and no update
      grants. Add allowlisted `source: "voice_note"` to the task activity
      payload. The review shows "Already created" for suggestions whose
      request UUID already exists. SQL and browser tests.
- [ ] **#14 Batch creation.** Checkboxes and "Create selected". Each task
      keeps its own request UUID and existing `createTask` recovery; report
      per-task results and never retry stale data silently.
- [ ] **#16 (optional)** Verify Supabase JWTs locally with JWKS and cache the
      keys; keep the Auth call for the anonymous-user check if JWT claims do not include it.

## Compliance track (#5, parallel, no code)

- [ ] Confirm the OpenAI data-processing agreement, retention of audio sent
      to transcription, and whether the EU endpoint covers both steps.
- [ ] Consent notice for people recorded on site, shown before analysis.
      Update the FR/EN privacy pages with processors, 30-day retention (D1)
      and purpose before any company is enabled (D4).
- [ ] Add the outcome to decision 030; do not claim compliance before it
      is confirmed.

## Out of scope

Automatic task creation, customer-facing use of transcripts, realtime
collaboration, a separate queue/worker service, and Dutch UI copy.
