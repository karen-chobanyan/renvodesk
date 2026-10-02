# Product roadmap — prioritized implementation plan

Date: 2026-09-30. Status: proposal; nothing below is implemented yet.

Items are ordered by value to renovation owners and by dependency: higher rows
unlock lower ones. Each milestone gets its own detailed plan and decision record
before coding, following the existing working practices (migration + rollback SQL
tests, regenerated types, FR/EN copy, desktop/mobile browser checks).

Guiding rule: finish the promised **estimate → project → costs → invoice** loop and
make profitability visible before adding breadth. AI features reuse the existing
site-note pattern (server-side call, validated structured proposal, owner review,
no automatic writes).

## Summary

| P | Milestone | Kind | Depends on | Size |
| --- | --- | --- | --- | --- |
| 1 | Contract value and project margin | Core | — | M |
| 2 | Company price list and estimate line upgrade | Core | — | M |
| 3 | "Needs attention" dashboard | Core | 1 | S–M |
| 4 | Variations (change orders) | Core | 1, 2 | L |
| 5 | AI receipt capture → proposed cost entry | AI | — (better with 1) | M |
| 6 | Project archive, workspace export, terms acceptance | Compliance | — | M |
| 7 | Customer approval links | Core | 4 | L |
| 8 | AI site notes → draft estimate lines | AI | 2 | M |
| 9 | AI line translation FR ↔ NL ↔ EN, Dutch UI | AI + i18n | 2 | M |
| 10 | Invoicing via provider (deposits, milestones, payments) | Core | 1, 4, provider decision | XL |
| 11 | Time tracking and labour costs | Field | 1 | M |
| 12 | Calendar export and notifications | Workflow | email provider for mail | S–M |
| 13 | AI estimate completeness check | AI | 2, history volume | S–M |
| 14 | AI weekly client update draft | AI | 7 (for delivery) | M |
| 15 | PWA install, HEIC photos, capture polish | Field | — | M |
| 16 | Company pipeline and profitability reports | Reporting | 1, 4, 10 | M |
| 17 | AI project document search | AI | retention decision | L |

Decisions needed from the owner before the milestone starts are marked **Decision**.

---

## P1 — Contract value and project margin

Why: the app promises "is this renovation profitable?" but today only shows budget
remaining, which the docs explicitly say is not profit.

- [ ] Add `contract_value_cents` derivation: sum of accepted estimates linked to the
      project (later + approved variations from P4). Server-computed, never client.
- [ ] Decide whether a project may have several accepted estimates (recommend yes,
      summed) and show which ones contribute.
- [ ] Extend the invoker summary RPC to return contract value, actual costs,
      expected margin (contract − budget) and actual margin (contract − costs),
      as integer cents with BigInt formatting on the client.
- [ ] Project overview: replace/extend `CostSummary` with revenue / costs / margin
      and margin %; label everything "excl. VAT"; distinguish expected vs actual.
- [ ] Owner-only: members must never mount or receive these figures (RLS + UI).
- [ ] Activity journal: no new events needed (estimate decisions already logged).
- [ ] Tests: SQL aggregate + isolation tests (member denial, cross-company),
      unit tests for margin formatting incl. negative margin, browser FR/EN.

Out of scope: VAT, invoiced revenue, commitments (purchase orders).

## P2 — Company price list and estimate line upgrade

Why: every estimate is typed from scratch; units are limited to m², fixed, item;
no labour/material split or markup. This is also the price source AI (P8, P13) must use.

- [ ] New `price_items` table (organization-scoped, owner-only): name, description,
      unit, unit price (decimal string, same limits as lines), optional labour and
      material cost parts, optional default markup %, category, archived flag,
      revision, request UUID.
- [ ] Extend allowed units: m, m², m³, h, day, kg, l, item, fixed (**Decision**:
      confirm list). Migration keeps existing values valid.
- [ ] Estimate lines: optional `price_item_id` reference and a copied snapshot of
      description/unit/price (catalog edits never change existing drafts or sent
      snapshots). Optional cost-per-unit field to show estimated line margin to
      the owner only — never printed on the customer PDF.
- [ ] Estimate editor: "Add from price list" searchable picker (server search,
      20-row pages), still allowing free-text lines.
- [ ] Price list page under company navigation with create/edit/archive, CSV import
      (validated server-side, dry-run preview, row errors), CSV export.
- [ ] Line sections/groups (e.g. "Demolition", "Tiling") with subtotals on PDF.
- [ ] Tests: decimal parsing, snapshot immutability after send, trigger totals
      unchanged, isolation, PDF rendering with sections (short + multi-page).

## P3 — "Needs attention" dashboard

Why: core promise "help owners see what needs attention". Rule-based first; no AI.

- [ ] New workspace home `/workspace/:organizationId` (register stays reachable).
- [ ] Server-side queries (limited, company-scoped), each with count + top items:
      overdue tasks, tasks due this week, estimates sent > N days without decision,
      drafts untouched > N days, projects over budget or with negative margin (P1),
      pending/failed uploads, (later) unpaid invoices.
- [ ] Owner sees everything; members see only their assigned tasks.
- [ ] Thresholds stored as workspace settings with defaults (**Decision**: defaults,
      e.g. 14 days for sent estimates).
- [ ] Empty, loading, error states; labels never claim global totals when capped.
- [ ] Tests: each rule's SQL boundary (dates as calendar days), member scope.

## P4 — Variations (change orders)

Why: unrecorded extra work is the main margin leak in renovation.

- [ ] `project_variations` table: title, lines (same validated JSON model as
      estimates, up to 100), server total, reason/notes, status
      draft → sent → approved/declined, revision, request UUIDs.
- [ ] Reuse the estimate event pattern: append-only `variation_events`, owner RPC
      with expected revision, required communication note, immutable sent snapshot.
- [ ] Approved variations add to contract value (P1); declined do not. Budget changes
      remain explicit owner actions (optional "add to budget" prompt).
- [ ] Project tab "Variations" + PDF export reusing estimate-pdf with a
      "Variation" label and a reference to the original estimate.
- [ ] Activity journal source trigger for variation decisions (owner-only visibility).
- [ ] Tests: transitions, retries, snapshot protection triggers, contract value
      aggregation, member denial, PDF text.

## P5 — AI receipt capture → proposed cost entry

Why: cost entry is the most skipped admin job, and costs drive margin (P1).

- [ ] Reuse camera capture + upload (image JPEG/PNG/WebP and PDF receipts) into
      project files; add "Read receipt with AI" for ready files (owner-only, flag).
- [ ] API route mirrors site-note jobs: POST → 202, polling, per-company opt-in,
      per-company daily and global monthly limits, request-ID idempotency, result reuse per file/prompt/model.
- [ ] Vision model returns one validated `propose_cost_entry` call: supplier, date,
      total incl. VAT, VAT amount(s) if printed, amount excl. VAT, category,
      short description, confidence flags. **Decision**: provider/model and EU data
      handling; keep `store: false` and document retention honestly.
- [ ] Server validation: amounts parsed to exact cents from strings; excl + VAT must
      equal incl when all present, otherwise flag; real date 1900–2100; category in
      the allowed enum. Never compute VAT from assumed rates.
- [ ] Review UI: receipt preview beside editable form; owner saves through the
      existing cost service (new link column `source_file_id`, same company/project FK).
- [ ] Logs free of receipt content, amounts, supplier names and URLs.
- [ ] Tests: validation unit tests (mismatched totals, missing fields, garbage),
      API authorization tests, mocked browser flow FR/EN. No live-provider claim.

## P6 — Project archive, workspace export, terms acceptance

Why: legal review lists these as High; they block a real launch.

- [ ] Project archive (status + hidden from default register), reversible. True
      deletion stays a documented manual procedure until retention rules are set.
- [ ] Owner-requested workspace export: ZIP of JSON/CSV for all tables plus files,
      generated server-side (API job), short-lived download link.
- [ ] Signup: link terms/privacy, record accepted terms version + timestamp in a
      server table; prompt existing users once on next login.
- [ ] Manual rights/closure runbook in docs (identity check, objects, backups).
- [ ] Tests: export completeness per table, isolation (only own company), acceptance record.

## P7 — Customer approval links

Why: acceptance is currently only recorded by the owner; direct approval is faster
and gives stronger evidence.

- [ ] Scoped, revocable, expiring token links for one sent estimate or variation;
      no membership, no other data visible.
- [ ] Public page renders the frozen snapshot + PDF download; customer enters name
      and explicitly accepts or declines; record IP-free evidence (timestamp, name,
      token id, snapshot hash). **Decision**: evidence level; not a qualified e-signature.
- [ ] Server endpoint (Fastify) validates token and performs the transition through a
      constrained function; rate-limited.
- [ ] Owner sees link status (opened, accepted, declined, revoked).
- [ ] Tests: token scope, expiry, revocation, replay, cross-company denial.

## P8 — AI site notes → draft estimate lines

Why: after a site visit the owner dictates scope; turning it into lines is slow.

- [ ] Extend site-note analysis with a second proposal type (or a separate prompt
      version) returning lines: description, quantity, unit, optional matched
      `price_item_id`, evidence passage.
- [ ] Prices come only from the matched price-list item; unmatched lines have empty
      price. Quantities only when spoken; never derived from sketches.
- [ ] Review screen: accept/edit/discard each line into a new or existing draft
      (single atomic save, 100-line cap respected).
- [ ] Tests: evidence verification, unknown item ids discarded, unit enum.

## P9 — AI line translation and Dutch UI

- [ ] Add Dutch (nl) UI copy across all domain copy files; PDFs in NL.
- [ ] "Translate lines" on a draft: translates descriptions only; quantities, units,
      prices untouched and re-verified server-side; side-by-side review.
- [ ] Optional per-client document language used as PDF default.
- [ ] Tests: copy completeness check for three locales, PDF NL fixture.

## P10 — Invoicing via provider

- [ ] **Decision**: provider (Peppol-capable for BE B2B e-invoicing; FR/NL rollout),
      B2B vs B2C scope, first country.
- [ ] Invoice types: deposit %, milestone, final (contract + approved variations
      − previous invoices). Server-controlled numbering via provider.
- [ ] Payment status tracking (manual first, provider webhook later, idempotent).
- [ ] Invoiced revenue added to P1 summary; unpaid invoices added to P3.
- [ ] Separate country billing module; verify official requirements before build.

## P11 — Time tracking and labour costs

- [ ] Members log hours per project/day (optionally per task); owner sets internal
      hourly cost per member (owner-only, never visible to members).
- [ ] Weekly approval by owner converts hours to labour cost entries (no double count).
- [ ] Mobile-first entry form; tests for isolation and cost conversion.

## P12 — Calendar export and notifications

- [ ] Per-user secret ICS feed of assigned tasks (revocable token).
- [ ] In-app notifications (assignment, due tomorrow, estimate decided).
- [ ] Email digests once SMTP provider is chosen (**Decision**).

## P13 — AI estimate completeness check

- [ ] Compare a draft with the company's accepted estimates of similar scope
      (price-list categories), list commonly included items that are missing.
- [ ] Advisory only; uses only this company's data; can be dismissed.

## P14 — AI weekly client update draft

- [ ] Draft from activity journal, completed tasks and owner-selected photos;
      excludes all financial data; owner edits; delivered via P7-style link or copy.

## P15 — PWA install, HEIC photos, capture polish

- [ ] Web app manifest + install prompt; no offline claims.
- [ ] HEIC/HEIF conversion pipeline server-side, thumbnails for images.
- [ ] One-tap "capture to project" from phone home screen.

## P16 — Company pipeline and profitability reports

- [ ] Estimates by status and value, win rate, margin per project, costs by
      category over time; CSV export for the accountant.

## P17 — AI project document search

- [ ] **Decision**: embedding provider, index retention and deletion semantics.
- [ ] Company/project-scoped index over PDFs text, notes and transcripts; answers
      cite sources; members only search what they can read.

---

## Cross-cutting rules for every milestone

- Write a detailed plan in `docs/plans/` and a decision record before coding.
- Tenant isolation via RLS with rollback SQL tests, including member and
  cross-company denial. Regenerate types after migrations.
- Exact integer-cent money, no floating-point totals, no assumed VAT rates.
- AI output is always a proposal: validated server-side, reviewed by the owner,
  saved through existing services. No automatic sending or writing.
- FR/EN (and NL after P9) copy complete; desktop and mobile verification;
  keyboard and empty/error states.
- Update AGENTS.md, README and DESIGN.md when behavior changes.
- New or changed screens get a fictional counterpart in `src/features/demo`
  and coverage in `tests/demo.spec.ts` (decision 031).
- New SPA routes (e.g. P3's workspace home, P7's public approval page) must be
  added to the route allowlists in `deploy/nginx.conf` and `deploy/Caddyfile`
  and to `scripts/check-vps-routing.mjs`; unknown paths return 404.
