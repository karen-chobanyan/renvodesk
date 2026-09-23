# RenvoDesk — Agent Guidelines

## Public landing page

`/` is the French public landing page and `/en/` its English version. The separate
landing entry is prerendered during build; `src/app-entry.tsx` owns application
routes. Keep the landing independent of auth/editor bundles and preserve reduced
motion, FR/EN copy and truthful feature boundaries. `SITE_URL` controls production
canonical/hreflang/sitemap metadata; unset builds are noindex previews. Deploy the
public HTML before the noindex `app.html` fallback. See docs/LANDING-PUBLISHING.md
and decision 016. Hosting and domain ownership remain unverified.

## Product

RenvoDesk is a minimal, professional SaaS for renovation companies in Belgium,
France, and the Netherlands. The chosen brand is **RenvoDesk** and the intended
domain is **renvodesk.com**. Domain ownership and trademark clearance are not yet
verified.

The core workflow is **estimate → project → costs → invoice**. Help owners see
what needs attention and whether each renovation is profitable. Support office
work on desktop and quick capture on phones at the job site.

This is a new, independent application. Carbon was evaluated as a reference and
was not selected as the foundation. Do not copy Carbon code, schema, assets, or
repository rules into this project without an explicit licensing review.

## Current state and decision status

Current implementation:
- React/TypeScript with Vite and React Router declarative routing.
- Supabase email/password auth, recovery/callback UI and protected `/workspace`.
- Company creation/selection with owner memberships and atomic onboarding.
- Persisted project creation/listing in the selected company, with pagination and
  recoverable retries. Fields: name, client name, city, optional address. Initial
  status defaults to `planning`. Protected detail pages support editing and status
  changes with revision-based conflict checks. Deletion is not implemented.
- Saved estimates support draft editing, server totals, pagination, revision conflicts,
  and owner-recorded sent/accepted/declined states. EUR excluding tax; at most 100 lines.
- Persisted project tasks with notes, optional dates, statuses, revision-safe edits,
  confirmed deletion and a company weekly/overdue/undated schedule.
- Separate fictional `/projects`, `/projects/:id` and `/estimates/:id` demos.
  Their records remain in memory and reset on reload, even when signed in.
- French/English UI, responsive layouts and `/design-system` component reference.

Agreed direction:
- Tailwind v4 and locally owned shadcn-style Radix primitives; reuse existing UI.
- Supabase/Postgres and Supabase Auth are connected. Private Supabase Storage is
  connected for project files, including metadata, upload/download, previews and deletion.
- French is the default language; English is available. Dutch is deferred.
- Excalidraw 0.18.1 is integrated for saved project sketches and annotations.
  Detailed measured floor planning is a separate future module.
- Persisted draft estimates now link to saved projects. PDF export and owner-recorded sending/decisions are implemented; email delivery and
  direct customer acceptance remain future milestones.

Still to decide before dependent implementation:
- Ubuntu VPS with Caddy and no Docker is selected; actual server provisioning and production rollout remain pending.
- Invoicing/accounting provider and country rollout details.
- Background processing and SMTP/email delivery providers. GA4 and Sentry integration is prepared; live dashboard ingestion remains unverified.
- Expanded team permissions and billing/subscription model. Owner and member roles are implemented; broader roles remain proposals.

Do not describe planned features, integrations or tests as implemented. Real email
confirmation and recovery delivery remain unverified; follow docs/SUPABASE.md for
required dashboard redirects and SMTP. No invoice, payment or tax compliance is implemented.

Use pnpm. Keep dependencies minimal; check current documentation, compatibility,
and licenses before adoption. Do not install competing UI systems for the same
purpose. Ask before adding major infrastructure or changing an agreed foundation.

## Planned product scope (not an implementation checklist)

1. Clients and properties: contacts, site addresses, billing details.
2. Estimates: reusable lines, labor/material costs, markup, PDF output, acceptance.
3. Projects: accepted-estimate conversion, budgets, simple schedules, documents.
4. Costs: materials, labor hours, supplier purchases, subcontract commitments,
   and receipt capture.
5. Variations: additional work, pricing, explicit customer approval, budget impact.
6. Billing: deposits, milestones, final invoices, payment tracking.
7. Drawings: editable sketches, photo/plan annotations, previews, revisions.

Defer full accounting, payroll, warehouse management, BIM/CAD, complex scheduling,
and automatic quantity takeoff unless explicitly requested.

## Architecture

- Organize business logic by domain, with clear boundaries between UI, validation,
  data access, and server-only operations. Follow the existing layout below.
- Keep secrets, privileged clients, and provider credentials on the server.
- Validate inputs at trusted server boundaries; client validation is UX only.
- Use transactions for related database writes and idempotency for retried actions
  with financial or external side effects.
- Avoid speculative abstractions, microservices, and generic workflow engines.
- Keep country-specific billing logic separate from project management.

### Existing code map

- `src/main.tsx`: route tree and providers; `/workspace` is behind `RequireAuth`.
- `src/features/auth`: session provider, account screens and localized auth copy.
- `src/features/organizations`: company onboarding, selection and data access.
- `src/features/projects/project-service.ts` and `saved-projects.tsx`: live project register.
- `saved-project-page.tsx`: live project details/editing and estimate list. Other
  project screens remain fictional demos.
- `src/features/estimates`: estimate-service, project-estimates and saved-estimate-page
  implement live drafts. estimate-lines is shared with the separate demo editor.
  draft-model handles persisted line serialization; model owns decimal calculations.
- `src/lib/demo-store.tsx`: in-memory demo state; never silently mix with live data.
- `src/lib/i18n.tsx`: shared FR/EN copy and formatting; auth and saved projects also
  own domain copy. Keep both languages complete when adding or changing text.
- `src/components/ui`, `src/components/shared.tsx`: reusable primitives/patterns.
- `src/styles.css`: semantic tokens and shared styling; `DESIGN.md` explains them.
- `src/lib/supabase`: publishable browser client and generated database types.
- `supabase/migrations`, `supabase/tests`: migrations and rollback-only isolation tests.

There is no custom server application yet. Use dedicated server endpoints or Edge
Functions if privileged work becomes necessary; never import privileged code into
the Vite browser bundle. Do not copy Carbon's module conventions into this repository.

## Authentication and tenant isolation

- Model organizations and memberships explicitly. A person may belong to several
  organizations; never equate a user ID with an organization ID.
- Proposed roles: owner, admin, project manager, field worker, accountant. Define
  permissions before implementing role-dependent screens.
- Every tenant-owned record must have an organization identifier. Scope queries
  and relationships to that organization and enforce isolation with Postgres RLS.
- Validate organization membership on the server. Never trust a submitted tenant
  identifier, an object path, or hidden UI controls as authorization.
- Ensure related records belong to the same organization, including file links.
- Use privileged service credentials only for narrowly justified server operations
  with explicit authorization; never expose them to browsers.
- Invitations must bind the intended organization, role, recipient, and expiry.
- Customer document/approval links grant narrowly scoped access, not membership.
- Test cross-tenant denial as well as normal authorized access.

## Financial and regional correctness

- Use decimal-safe monetary calculations with explicit currency and rounding rules.
  Never use floating-point arithmetic as the source of truth for financial totals.
- Distinguish markup from margin, net from gross, and committed from actual costs.
  Do not double-count a commitment when its invoice becomes an actual cost.
- Preserve accepted estimate, approved variation, and issued invoice snapshots.
  Corrections must follow explicit business rules rather than silently rewriting
  customer-approved history.
- Keep invoice numbering and issuance rules server-controlled.
- Never hardcode one VAT rate or assume all renovation work has the same treatment.
  Country, customer type, work type, and applicable conditions can matter.
- Verify current official requirements before implementing tax, e-invoicing, or
  reporting behavior. Integrate an appropriate provider; a PDF alone does not
  establish compliance. Distinguish B2B from homeowner/B2C workflows.
- Use locale-aware number/date formatting and translation keys. Store calendar
  dates separately from timestamp instants; make timezone behavior explicit.
- Never parse dates or money from display-formatted strings through ad hoc logic.

## Design system

Aim for a calm, architectural, professional interface: warm off-white backgrounds,
white surfaces, charcoal text, navy actions and muted sage navigation/statuses.
This foundation is implemented in src/styles.css, with self-hosted Inter Variable.
Use DESIGN.md and the existing reference screens when extending it.

- Define semantic tokens for colors, spacing, typography, radii, and control sizes.
  Components consume tokens; avoid arbitrary per-screen styles.
- Use one primary sans-serif family and tabular numerals for financial data.
- Build shared page headers, tables, form fields, status badges, money fields,
  upload controls, and budget summaries before duplicating patterns.
- Keep navigation compact, page hierarchy clear, and primary actions obvious.
- Prefer readable tables and purposeful summaries over decorative card grids.
- Use photos when useful to the project, restrained borders/shadows, and motion
  that explains state changes. Respect reduced-motion preferences.
- Design loading, empty, error, validation, disabled, and permission-denied states.
- Support keyboard navigation, visible focus, labeled fields, accessible contrast,
  and touch targets suitable for site use. Never communicate status by color alone.
- Test French and English labels, long names, and localized euro amounts.
- Establish project list, project overview, and estimate editor as reference screens.
- Maintain DESIGN.md and a component showcase as the system is implemented.

## Files and drawings (requirements for future implementation)

- Keep business files in private storage with organization/project access policies.
  Store metadata and business links in Postgres; file contents belong in storage.
- Retain original filename, object key, type, size, uploader, version, and ownership.
  Use immutable object keys for revisions; do not overwrite approved attachments.
- Validate upload permissions, supported types, and size limits. Treat uploaded
  content as untrusted and serve previews safely.
- Provide upload progress, retry/recovery, image/PDF previews, and thumbnails.
  Handle phone photos, including HEIC, deliberately rather than assuming JPEG.
- Use resumable uploads where appropriate. Do not claim full offline support merely
  because failed uploads can resume.
- Use short-lived download URLs after authorization. Revocable app share links
  must be separate from already issued storage URLs and their expiry semantics.
- Plan recovery for both stored objects and database metadata; database backup alone
  is not a file backup. Avoid orphaned uploads and dangling metadata.
- Store drawings with editor type, source format version, editable scene, linked
  assets, and preview. Persist embedded assets as well as shapes.
- Integrate Excalidraw autosave, save status, project permissions, revision history,
  and conflict handling. Embedding an editor does not implement these automatically.
- Render selected PDF pages as backgrounds for annotation when needed; preserve
  the original source document and page reference.
- Sketch dimension labels are not measured geometry. Do not derive quantities or
  prices from sketches. Future measured plans use a separate domain model.

## Working practices

- Inspect existing code and closest AGENTS.md before changing a subsystem.
- For non-trivial work, write a short checkable plan under docs/plans/ before coding.
- Keep changes focused and integrated through real call sites. Prefer the simplest
  implementation that satisfies the current requirement.
- Ask before expanding scope, major architecture changes, destructive migrations,
  production data changes, or paid/external commitments.
- Never commit secrets or use real customer data in fixtures or screenshots.
- Do not run destructive resets, force-push, or rewrite user changes without approval.
- Record durable decisions in docs/decisions/ as they are made. Keep this document
  aligned with the actual repository and replace provisional decisions explicitly.

## Verification

Commands: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm test:e2e` (install Chromium first with `pnpm exec playwright install chromium`).
Development: `pnpm dev`. Architecture and implemented boundaries: README.md and
`docs/decisions/001-client-foundation.md`.
Do not invent a command or report an unrun check as passing.

- Run checks relevant to each change and report the actual results and limitations.
- Test calculations, authorization, tenant isolation, approval transitions, upload
  access, and invoice state changes where implemented.
- Verify important UI flows at desktop and mobile sizes, including errors and empty
  states. Include keyboard checks and localized content.
- After database schema changes, regenerate database types before typechecking.
- For drawings, verify save/reopen with embedded images and permission boundaries.
- Never call a feature complete based only on a successful compile or static mockup.

## Supabase implementation

- Development project: RenvoDesk (`oripsywzngftarbprlgk`), Frankfurt (`eu-central-1`).
  Do not apply changes to other Supabase projects.
- `.env.local` is ignored; `.env.example` documents the URL and publishable key.
  Only public configuration belongs in `VITE_*`; never put service-role secrets there.
- `organizations`, `organization_memberships`, `projects` and `estimates` are implemented.
  Organization onboarding atomically creates the company and owner membership via
  `create_organization`, with verified non-anonymous user checks and idempotency.
- The public onboarding RPC is SECURITY INVOKER and delegates to a private,
  constrained SECURITY DEFINER function. Preserve that boundary. Before adding
  membership removal, revisit replay behavior: onboarding can repair the creator's membership.
- Users can read only their own memberships and member organizations. Clients cannot
  directly write memberships, rename companies or delete companies. Owner contact
  updates are restricted to contact_address/email/phone and contact_revision.
- Projects use `(organization_id, id)` as a composite primary key. Reads require
  membership; inserts and updates require ownership. Column grants keep organization,
  id and creation timestamp immutable. Only editable fields and revision have update
  grants; deletion remains unavailable. Updates match organization, id and loaded
  revision; the trigger requires an increment of one. Never retry stale writes against
  a newer revision automatically. Preserve fields on conflicts until the user reloads.
- Project list queries explicitly filter organization_id, use 20-row pages and stable
  ordering. Create retries retain the request UUID and read an existing duplicate
  without overwriting it. This is request recovery, not offline synchronization.
- Generated types live in `src/lib/supabase/database.types.ts`; regenerate after
  migrations, before typechecking. Never edit generated types manually.
- Keep migration files and the remote migration history aligned. Do not run resets
  or destructive schema changes without authorization.
- Auth UI session state is not authorization; RLS remains the enforcement boundary.
  Keep demo routes separate until each domain has a schema and isolation tests.
- Run rollback SQL tests for authorization changes. Browser tests mock APIs and
  cannot prove database isolation or email delivery. Do not disable confirmation
  to work around SMTP or redirect configuration.

Setup: docs/SUPABASE.md. Historical foundation decisions:
docs/decisions/001-client-foundation.md and 002-auth-and-company-isolation.md.
Read README.md and the latest milestone plans for current implementation status.

## Draft estimate invariants

- Composite (organization_id, project_id) FK links estimates to same-company projects.
- Lines are a validated JSON array saved atomically on one draft row, capped at 100.
  Do not write lines in a loop or permit partially saved documents.
- Quantity and price are decimal strings (up to seven integer and two decimal digits).
  Descriptions are required, max 500 characters; units are m², fixed or item.
  Empty drafts and zero prices are allowed; quantities must be positive.
- The database trigger computes total_cents using exact numeric arithmetic and
  half-up rounding per line, capped at JS's safe integer maximum. Never accept a
  client total as authoritative. Shared client helpers provide matching previews.
- Only owners read/create/update drafts; queries are scoped by organization and
  project. Identity, project link, currency, status and totals have no client write
  grants. Updates use the loaded revision and require an increment of one.
- EUR currency is fixed. Drafts can become sent, then accepted or declined through
  the owner-only transition RPC. No tax calculation, invoices, direct customer acceptance
  or automatic budget updates are implemented.
- Preserve inputs on failed saves; conflicts require explicit reload. Unsaved edits
  are memory-only and are lost when navigating away. Do not claim offline support.

## Draft PDF exports and company contacts

- Contact fields on organizations are optional, validated and owner-editable.
  contact_revision protects concurrent edits; immutable company fields have no grants.
- ExportEstimate rereads estimate, organization and project using RLS-scoped queries.
  Block unsaved edits and stale estimate revisions. Never export demo or unsaved data
  under a saved-draft label; never infer VAT, acceptance or invoice numbering.
- estimate-pdf uses lazy-loaded jsPDF/AutoTable with local Noto Sans (OFL). Keep font
  license attribution. Use exact integer-cent formatting, Unicode text, wrapping,
  repeated headers, page numbers and a Draft marker on every page.
- Draft PDFs contain current company/project data; sent/accepted/declined PDFs use
  the frozen sent snapshot. PDF status is explicitly owner-recorded. PDFs are not
  invoices, uploaded automatically, or emailed by the application.
- Verify generated PDF text and render short/multi-page FR/EN fixtures before
  changing layout; a passing browser download test alone does not verify pagination.

## Project file invariants

- project_files links to projects through a composite organization/project FK.
  Keys are generated organization/project/file UUID paths. Original names are data,
  never paths. Metadata includes uploader, MIME, size and initial version 1.
- Private project-files bucket limits uploads to 10 MiB and the supported MIME list.
  Client extension/MIME validation improves UX; it is not malware/content scanning.
  HTML/SVG and HEIC/HEIF are not supported. No thumbnail/HEIC conversion pipeline yet.
- Reserve metadata before uploading. State transitions are pending → ready or
  deleting → deleted; ready may only move to deleting. Repeated same-state requests
  are safe. Finalization verifies object MIME/size. Retain deleted tombstones.
- Upload policy locks the pending reservation FOR SHARE until the Storage transaction
  commits, so deletion cannot race it. No object UPDATE policy: never upsert/overwrite.
- Owners upload/delete; members read. Every metadata query filters organization and
  project. Sign preview URLs for one hour; do not persist or log signed URLs/tokens.
- Delete via Storage API, then finalize metadata. Never delete storage.objects rows
  directly. Failed transfers/deletions remain recoverable; do not hide pending work.
- Back up object bytes as well as Postgres metadata. Do not claim database backups
  alone recover files or that upload retry is resumable/offline support.

## Shared workspace layout

Protected workspace, project and estimate pages reuse the demo application shell.
The saved project register uses the same visual hierarchy and table styles, with
search/status filters and counts scoped to loaded projects. Company settings have a dedicated page. Saved project pages provide links to details, estimates and files.
Saved projects have private editable sketches; task navigation opens the live company schedule.
The global estimates link opens the live company estimate register.
Keep demo records separate from live data while replacing previews incrementally.
See docs/decisions/007-shared-workspace-design.md.

Saved project overview now mirrors the demo detail composition: real project header/status and client/address sidebar, live cost-budget metrics and breakdown, sketch navigation, and live estimate/file sections. Financial amounts are saved integer cents. Site editing and revision-conflict recovery remain available below the overview.

## Project tasks and schedule invariants

- `src/features/tasks` owns task model, localized copy, data access, project editor
  and company schedule. Generated task types come from Supabase.
- `project_tasks` uses composite organization/project FK and existing membership RLS.
  Owners create/update/delete and assign tasks. Members read and edit only tasks
  assigned to them; they cannot reassign or delete. Explicit grants prevent identity edits.
- Preserve revision matching on update AND deletion. Never overwrite a conflict.
  Preserve request UUID on create retry; duplicate recovery never overwrites data.
- Dates are calendar strings, not timestamp instants. Validate real YYYY-MM-DD dates,
  1900–2100, and start <= due when both exist. Arithmetic/formatting uses UTC solely
  to preserve the calendar day; today is the browser's local day.
- Weekly queries include overlapping ranges and either single-date case. Filter on
  server before 50-row pagination; do not label loaded counts as global totals.
- Overdue excludes done and requires a past due date. Undated excludes done and
  requires both dates null. A start-only task is one scheduled day, not open-ended.
- Task demo prompts have been replaced with live schedule navigation. Project sketches are connected to private storage. Task assignment is implemented; dependencies and realtime remain deferred.

## Company and account navigation

The live sidebar owns company selection, Add a company, Company settings, demo
access and account sign-out. Projects no longer embeds company administration.
`/workspace?company=<id>` selects the project register; project, schedule and settings
routes carry the company ID in the path. Switching companies returns to that company’s
register. `/workspace/:organizationId/settings` contains document contact details.
Selection is explicit in the URL and survives reload; unqualified `/workspace` uses
the first available membership. No permissions or database schema changed.

Live sidebar identities use compact avatar/name disclosure rows matching the demo. Company selection, add/settings links and account sign-out are inside keyboard-accessible expandable panels. Escape closes the panel and returns focus to its trigger; mobile drawer remains scrollable.

Company estimates: `/workspace/:organizationId/estimates` lists saved drafts with server-side title/project/client search, 20-row pagination and direct draft/project links. Creation starts from a project. No schema or permission changes; demo estimate routes remain separate.

## Project cost budgets

Saved project pages now show real **Budget and costs**: set a cost allowance, add
materials/labor/subcontractor/other expenses with date and notes, correct entries or
void them with confirmation. Voided entries remain visible but are excluded from
totals. Financial figures use EUR excluding tax. Budget remaining is not profit;
contract revenue, commitments, VAT, refunds and accounting are not implemented.
`src/features/costs` owns this feature; see decision 010. Preserve exact integer-cent
parsing and BigInt aggregate formatting, company/project scoping, independent revision
checks, same-company FKs and the invoker summary RPC. Never sum a paginated list to
produce project totals. No automatic changes to draft estimates or project revisions.

## Clients and properties

The live sidebar opens `/workspace/:organizationId/clients`. Create and edit
individual or company contacts, optional email/phone/billing address, and multiple
properties with site address, city and country (BE/FR/NL). Lists use 20-row pages;
client name search runs on the server. New projects can select a saved client and
property to copy their details, or use manual entry.

Project text remains a snapshot: directory edits do not change existing projects.
Existing projects are not automatically linked; linked IDs cannot be reassigned yet.
No directory deletion, merging, imports or automatic billing-address PDF integration
is implemented. Only owners read/write the client/property directory; revision checks prevent stale edits,
and stable request IDs recover interrupted creates without overwriting records.
See `docs/decisions/011-clients-properties.md`.

## Team and task assignments

The company menu opens **Team** at `/workspace/:organizationId/team`. Owners create
email-bound invitation links valid for seven days, copy/share them, revoke pending
invitations and remove members with confirmation. Acceptance at `/invite/:id` requires
a verified account matching the invited email and an explicit click. Login/signup
preserve that invitation destination. Invitation email delivery is not implemented.

Members view company projects/files/tasks and edit their assigned tasks. Project
creation/editing, file uploads/deletion, finance, the client directory and company/team
administration remain owner-only. Task editors offer a paginated company assignee
picker; the schedule can show only the signed-in user's tasks. Removal revokes access
and invitations and clears assignments atomically, retaining the tasks and files.

`src/features/team` owns the UI, service calls and role-aware controls. SQL policies
and constrained private functions enforce permissions independently of the UI. Never
add role escalation, allow arbitrary acceptance email/user IDs, expose privileged
keys, or silently retry stale task updates. Owners cannot be removed through this API.
See decision 012 and `supabase/tests/team_isolation.sql`.

## Project sketches

`src/features/sketches` owns project sketch lists, immutable scene/PNG bundles,
lazy-loaded Excalidraw, autosave/retry and history. Owners create/edit/restore;
members view committed revisions and export. Every query filters company/project.
Sources include embedded PNG/JPEG/WebP images (8 MiB, 2,000 elements); previews are
limited to 1 MiB. No measured geometry, realtime collaboration, deletion, PDF page
import or offline sync. Failed pending uploads remain private; cleanup is deferred.

Reserve an immutable save UUID, upload both objects without upsert, then call
`publish_sketch`. Publication checks owner, object MIME/size and loaded revision
under row locks. Retry the same snapshot/UUID; verify bytes when recovering duplicate
uploads. Committed saves are immutable; restore creates a new revision. SHA-256
verification runs in the client; server publication validates metadata, not hashes
or semantic drawing content. Never claim malware scanning.

Keep editor code lazy-loaded and fonts self-hosted via the build/dev copy script.
Project sketch lists, previews and activity open the modal in place without changing
the route or reloading the application. Revision selection and restore stay in modal
state. Guard closing or switching revisions while edits are pending; beforeunload
still protects actual page exits. Old sketch URLs remain direct-link fallbacks.
Preserve locale across reloads. Database tests are rollback-only fixtures; browser
tests mock APIs and do not establish real Storage network delivery. Desktop history
is a side panel; mobile history docks below the canvas.
See `docs/decisions/013-project-sketches.md`.

## Estimate decision workflow

`record_estimate_event` performs owner-authorized Draft → Sent → Accepted/Declined
transitions with expected revisions and immutable request IDs. Each requires a
communication reference note and explicit confirmation. Never imply email delivery,
a customer signature or independently verified acceptance. Server timestamps are
recording times. Empty drafts cannot be marked sent.

Sending freezes title, lines, exact totals and company/client/site snapshot. Database
triggers protect sent content, not only disabled UI. `estimate_events` is owner-only
and append-only through the constrained RPC. Retrying the same UUID/arguments
returns current state without duplicating history; changed arguments are rejected.
Failed transitions retain the request and lock draft edits until retry or reload.
Terminal decisions cannot be reopened or corrected in this first workflow; create
a separate draft for changed work. No budget/revenue changes happen automatically.

PDFs for non-drafts must use `sent_snapshot`, never mutable company/project records.
Keep draft PDF behavior and exact cents intact. See decision 014 and
`supabase/tests/estimate_workflow.sql`.

## Project detail layout

Saved projects use `?tab=overview|tasks|budget|estimates|documents`, with old
`#project-*` links mapped to matching panels and `#site-details` opening the editor.
`ProjectHeader`, `ProjectNavigation`, and the independent `CostSummary` own the
composition. Owner-only financial panels must never mount for members. Working
panels mount on first visit and remain hidden thereafter so tab changes preserve
form/file state. Overview remounts to refresh its bounded previews.

Use scoped class `project-detail-workspace`, not the demo's `project-workspace`
grid. Context must remain available when summary calls fail. Preview task/file
queries filter by company AND project with server limits; don't turn loaded preview
counts into aggregate claims. Project editing uses the shared dialog, revision
checks, and an unsaved-close warning. See the project-view-layout plan.

- Project files support camera JPEG capture and MediaRecorder voice notes (WebM, MP4/M4A, Ogg). Review before upload; existing owner-only writes and member reads apply. Capture must release tracks on close/unmount; recording is capped at five minutes / 10 MiB. Audio MIME allowlists are in the project_voice_notes migration; do not broaden them to arbitrary video.

## Project activity journal

`src/features/activity` owns the saved project sidebar journal and `?tab=activity`.
`project_activity` is a read-only, append-only projection populated by private
transactional source triggers. Never append events from the browser. Capture only
meaningful successful changes; preserve source revision/retry semantics. A failed
journal insert must roll back the source write. Estimate decisions come only from
`estimate_events`, and sketches only from creation or committed saves.

RLS hides all estimate/cost activity from members, including labels and payloads.
All queries scope company/project, use timestamp/UUID keysets and filter before
limits. Keep actor identity server-derived and payloads allowlisted; no full notes,
addresses, estimate lines, email snapshots or signed URLs. Preserve the private
trigger's fixed-source allowlist, empty search_path and actor/membership checks.
Meaningful null-auth maintenance writes fail until a specific internal path exists.

`project_files.activity_was_ready` has no browser write grants and distinguishes
real document deletion from cancellation of a pending upload. Keep that provenance
when updating file lifecycle logic. Tracking starts at the server-owned
`project_activity_tracking` marker; do not fabricate pre-rollout history. Activity
remounts on entry and refreshes on project revision changes; other visited working
panels retain their forms. No Realtime, manual notes, autosave grouping or email
digests. See decision 015 and `supabase/tests/project_activity.sql`.

Live navigation sidebar is limited to brand/company, primary business routes and
account controls. Explore demo is inside the account disclosure. Cookie settings
are an inline app-footer control; the Components footer link is removed. Do not reintroduce repeated connected-workspace notices
or Resources headings to the live sidebar. Demo routes retain explicit demo labels.

## Production telemetry and VPS

Ubuntu/Caddy without Docker is the selected hosting target. `deploy/Caddyfile`
serves public prerendered pages before restricted noindex app fallback; unknown
paths return 404. `deploy/production.env.example` holds provided public GA4/Sentry
configuration. No remote deployment or provider dashboard changes have been made.

`src/lib/telemetry` requires a production build, exact origin and separate opt-in
for analytics/diagnostics. Do not add autocapture, replay, advertising, raw URLs,
record IDs, names, amounts or documents. Track only confirmed persisted actions;
request deduplication keys remain in memory and are never sent. Signup API success
is not verified signup. The database journal remains the business history source.
GA Enhanced measurement must be disabled in the dashboard before production use.
Sentry reports strip raw messages and context; source maps are not uploaded.

Privacy explanation pages are available in FR/EN but operator details/contact and
the complete service privacy notice remain required before public launch. See
`docs/TELEMETRY.md`, `docs/VPS-DEPLOYMENT.md` and decision 017. Browser telemetry
checks mock all providers; they do not establish real account ingestion.

Hosting preference updated: Ubuntu with Nginx, without Docker. Use deploy/nginx.conf
and docs/NGINX-DEPLOYMENT.md; Caddy files remain an alternative. Do not run both
on the same HTTP/HTTPS ports. No VPS deployment has been performed.

## Project DXF previews

Project Documents accepts DXF attachments up to 10 MiB with canonical
`application/dxf`; existing owner uploads/deletion, member reads, private storage,
immutable keys and lifecycle policies apply. `src/features/cad` owns the shared
read-only canvas and lazy preview. Signed URLs stay in the parent; downloads are
bounded and abort on close. Loaded DXF previews remain open until closed; signed
URL expiry only limits subsequent downloads. Reopening requests a fresh URL.
No DWG, CAD editing, export, takeoff or layout tabs are implemented.

`cad-canvas.html` is included in the normal build and needs its exact same-origin
frame exception in the hosting configuration. Keep runtime helpers out of the CAD
chunk so the landing never imports it. `cad-prototype.html` remains excluded from
the application build; `pnpm dev:cad`, `pnpm build:cad`, `pnpm test:cad` retain the
local evaluation and rendering regressions. No GPL DWG parser is installed.
See decisions 018/019 for fidelity, main-thread resource limits and verification.
