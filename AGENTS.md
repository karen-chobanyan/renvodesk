# RenvoDesk — Agent Guidelines

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
- Saved draft estimates support title/line editing, server totals, pagination and
  revision-based conflict handling. EUR excluding tax; at most 100 lines.
- Separate fictional `/projects`, `/projects/:id` and `/estimates/:id` demos.
  Their records remain in memory and reset on reload, even when signed in.
- French/English UI, responsive layouts and `/design-system` component reference.

Agreed direction:
- Tailwind v4 and locally owned shadcn-style Radix primitives; reuse existing UI.
- Supabase/Postgres and Supabase Auth are connected. Private Supabase Storage is
  selected but uploads, file metadata and storage policies are not implemented.
- French is the default language; English is available. Dutch is deferred.
- Excalidraw is selected, not integrated, for quick sketches and annotations.
  Detailed measured floor planning is a separate future module.
- Persisted draft estimates now link to saved projects. Draft PDF export is implemented; sending and
  customer acceptance remain future milestones.

Still to decide before dependent implementation:
- Frontend deployment provider and production hosting configuration.
- Invoicing/accounting provider and country rollout details.
- Background processing, SMTP/email delivery and monitoring providers.
- Expanded team permissions and billing/subscription model. Owner is the only
  implemented role; other roles below are proposals, not an agreed permission matrix.

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
- Only owners create/update drafts; member reads are scoped by organization and
  project. Identity, project link, currency, status and totals have no client write
  grants. Updates use the loaded revision and require an increment of one.
- Draft status and EUR currency are fixed. No tax calculation, document issuance,
  acceptance, version history or automatic budget updates are implemented.
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
- PDFs contain current company/project data alongside a saved draft revision. They
  are not immutable issued documents and are not uploaded or emailed automatically.
- Verify generated PDF text and render short/multi-page FR/EN fixtures before
  changing layout; a passing browser download test alone does not verify pagination.
