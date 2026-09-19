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

This repository contains a Vite/React frontend foundation with fictional, session-only demo data. Do not describe planned features,
commands, integrations, or tests as implemented before they exist.

Agreed direction:
- React and TypeScript, with shadcn/ui and Tailwind CSS for the interface.
- Supabase/Postgres, Supabase Auth, and private Supabase Storage.
- French and English localization now; Dutch is deferred.
- Excalidraw for quick project sketches and annotations.
- Detailed, measured floor planning is a separate future module.

Still to decide before dependent implementation:
- Deployment provider and production region. React + Vite + React Router are selected.
- Invoicing/accounting provider and country rollout details.
- Background processing, email delivery, and monitoring providers.
- Final role/permission matrix and billing/subscription model.

Use pnpm. Keep dependencies minimal; check current documentation, compatibility,
and licenses before adoption. Do not install competing UI systems for the same
purpose. Ask before adding major infrastructure or changing an agreed foundation.

## Initial product scope

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
  data access, and server-only operations. Establish the actual directory layout
  during scaffolding and document it here.
- Keep secrets, privileged clients, and provider credentials on the server.
- Validate inputs at trusted server boundaries; client validation is UX only.
- Use transactions for related database writes and idempotency for retried actions
  with financial or external side effects.
- Avoid speculative abstractions, microservices, and generic workflow engines.
- Keep country-specific billing logic separate from project management.

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
white surfaces, charcoal text, and a restrained deep-blue accent. These are initial
visual directions to refine through reference screens.

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

## Files and drawings

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
