# RenvoDesk

A minimal SaaS for renovation companies in Belgium, France and the Netherlands.
The intended workflow is **estimate → project → costs → invoice**, with a clear
view of each renovation and its profitability. French and English are supported
now; Dutch is deferred. The chosen domain is **renvodesk.com**; ownership and
trademark clearance have not been verified.

RenvoDesk is an independent application. Carbon was evaluated as a reference,
not selected as the codebase.

## Current state

| Area | Implemented | Boundary |
| --- | --- | --- |
| Authentication | Email/password signup, login, logout, confirmation callback and password recovery UI | Real email delivery still needs dashboard/SMTP configuration and verification |
| Companies | Create and select companies; users can belong to several organizations | Optional document address/email/phone; owner/member roles and invitation links; no automated invitation emails |
| Saved projects | Create, list, open and edit company projects; status changes, pagination and stale-edit protection | Cost budgets and expense tracking; no project deletion |
| Project demo | Search, status filters, create dialog and financial overview | Fictional data held in memory; edits reset on reload |
| Saved estimates | Project-linked drafts, editable lines, atomic saves, server-calculated totals and conflict protection | EUR excluding tax; up to 100 lines; owner-recorded decisions; no email delivery, customer signature or invoicing |
| Draft PDF export | French/English downloads with contacts, client/site details, line items, exact cents and page numbers | Saved drafts only; no VAT calculation or issued-document snapshot |
| Estimate demo | Editable lines, decimal-safe totals and session-only saving | No database persistence, PDF export, acceptance or invoicing |
| Design foundation | Responsive layouts, French/English, reusable primitives and component showcase | Demo thumbnails are illustrative; saved projects have editable sketches |

Saved projects capture a name, client name, city and optional site address. The
server sets the initial status to preparing. Projects can select saved clients and properties, retaining a snapshot of their details. No real financial totals are
inferred from demo data.

## Run locally

Requires Node 20.19+ and pnpm 10 (the exact package-manager version is in package.json).

```sh
pnpm install
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.
pnpm dev
```

Open [the application](http://127.0.0.1:5173/login). Use only the Supabase
publishable key in browser configuration; never add a service-role or secret key.
`.env.local` is ignored by Git. Vite must be restarted after environment changes.
The demo is accessible without Supabase configuration at `/projects`.

The development Supabase project is **RenvoDesk**, reference
`oripsywzngftarbprlgk`, in **Frankfurt (eu-central-1)**. Follow
[Supabase setup](docs/SUPABASE.md) for email confirmation, callback/reset redirect
allowlists and SMTP. These settings are required before considering real signup
and recovery email flows verified.

## Routes and data boundaries

| Routes | Purpose |
| --- | --- |
| `/` | Redirects to the authenticated workspace, or login without a session |
| `/login`, `/signup` | Account access |
| `/auth/forgot`, `/auth/reset`, `/auth/callback` | Recovery and email callback handling |
| `/workspace` | Authenticated company selection, onboarding and persisted project register |
| `/workspace/:organizationId/projects/:id` | Saved project details, editing, status changes and estimates |
| `/workspace/:organizationId/projects/:id/estimates/:estimateId` | Persistent draft estimate editor |
| `/projects`, `/projects/:id` | Separate fictional project demo |
| `/estimates/:id` | Separate fictional estimate editor |
| `/design-system` | Shared design/component reference |

Demo records do not become company records after signing in. Do not enter customer
data into the demo. Database RLS, rather than browser session state, enforces
organization isolation. Project creation retries reuse a UUID and recover an
already-saved record without overwriting it.

## Technical and product decisions

- React + TypeScript, Vite and React Router declarative routing; pnpm for packages.
- Tailwind v4, semantic CSS tokens, locally owned shadcn-style Radix primitives,
  Lucide icons and self-hosted Inter. See [DESIGN.md](DESIGN.md).
- Supabase Auth and Postgres are connected. Private Supabase Storage is connected
  for project files with metadata, recovery states and access policies.
- Excalidraw is integrated for quick sketches and annotations in saved projects.
  Detailed measured floor planning is a separate future module.
- Monetary calculations use integer cents and decimal-safe helpers. Demo amounts
  do not implement country-specific VAT or invoicing compliance.
- Deployment, SMTP provider, accounting/e-invoicing provider, billing model,
  expanded team permissions, background processing and monitoring remain open.

Next estimate milestones are email delivery and direct customer acceptance. Variations,
invoicing and payments remain planned. Clients/properties, cost budgets, tasks,
schedules, project files, team access and sketches are implemented. Full accounting, payroll, warehouse management, BIM/CAD and automatic
quantity takeoff are outside the initial scope.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright starts or reuses the server on port 5173 and checks desktop/mobile flows.
Auth and connected-project browser tests mock the configured development project's
API: they verify UI behavior, reloads, lost-response retries and editing conflicts without sending email.
They are not evidence of real email delivery or an end-to-end live browser connection.

Live database isolation tests are in `supabase/tests/company_isolation.sql` and
`supabase/tests/project_isolation.sql`, `supabase/tests/project_editing.sql` and
`supabase/tests/estimate_isolation.sql`. Execute them against the development database
as complete transactions; their temporary fixtures roll back. They cover tenant
isolation, anonymous denial, write restrictions, validation, revision increments and stale-update rejection.

Last implementation verification (2026-09-20): lint, typecheck and build passed;
28 unit tests and 25 browser tests passed, with one intentional desktop skip for
the mobile navigation test. Live SQL isolation tests passed. The security advisor reported leaked-password
protection disabled in Auth; no estimate-schema findings were reported. This is a dated result, not a production-readiness claim.

## Repository map

- `src/main.tsx`: providers and routes.
- `src/components/ui`, `src/components/shared.tsx`: primitives and shared patterns.
- `src/features/auth`, `src/features/organizations`: account and company workflows.
- `src/features/projects`: demo screens plus `saved-projects.tsx` and `project-service.ts` for live data.
- `src/features/estimates`: shared line editor, calculations, live draft services/screens and separate demo.
- `src/lib/i18n.tsx`, `src/lib/demo-store.tsx`: localization and separate demo state.
- `src/lib/supabase`: browser client and generated database types.
- `supabase/migrations`, `supabase/tests`: schema history and SQL isolation tests.
- `tests`: Playwright flows; unit tests live beside their source.
- `docs/plans`, `docs/decisions`: milestone plans and historical architecture decisions.

Read [AGENTS.md](AGENTS.md) before implementation. Decision records describe their
respective milestones; this README describes the current application. Before
hosting the frontend, configure SPA history fallback and production auth redirects.

## Export a draft PDF

In Workspace, expand **Document contact details** for the selected company to save
an optional address, email and phone. Open a saved project and estimate, save any
changes, then choose **Download PDF**. The current interface language controls the
PDF labels; customer descriptions remain unchanged. Export rereads the saved
estimate and requires the displayed revision to match. Company/site details are
current data, not an archived legal snapshot.

PDF generation runs locally in the browser using lazy-loaded jsPDF 4.2.1 and
jsPDF-AutoTable 5.0.8 (MIT). Noto Sans is bundled under SIL OFL in public/fonts.
No external PDF service or email is used. One-page French and seven-page English
fixtures were rendered and visually checked, with PDF text/total assertions.

## Project files

Open a saved project and scroll to **Project files**. Select a PDF, JPEG, PNG,
WebP, TXT, DOCX or XLSX file up to 10 MiB, then upload. Images and PDFs have private
previews; other documents download. Deletion requires confirmation. HEIC/HEIF
conversion is not implemented: convert these photos to JPG/PNG first.

Uploads show transfer progress. If a response is lost, retry or use Verify upload;
pending entries can also be removed. Interrupted deletions remain available to
retry. This is not resumable/offline upload support. Files use unique immutable
keys; replacement/version history and malware scanning are not implemented.
Preview URLs expire after 60 seconds; the UI closes their content after 55 seconds.
PDF.js renders pages inside the app with previous/next controls; download remains
the fallback for unsupported or damaged documents. The viewer loads only when needed.

Storage API upload/download/signing/deletion was tested live using a temporary
synthetic account and object, then cleaned up. SQL tests verify tenant policies;
browser tests mock the API and cover errors, recovery, previews and deletion.

## Shared workspace layout

Protected workspace, project and estimate pages reuse the demo application shell.
The saved project register uses the same visual hierarchy and table styles, with
search/status filters and counts scoped to loaded projects. Company settings have a dedicated page. Saved project pages provide links to details, estimates and files.
Sketch previews are explicitly fictional; task navigation opens the live company schedule.
The global estimates link opens the live company estimate register.
Keep demo records separate from live data while replacing previews incrementally.
See docs/decisions/007-shared-workspace-design.md.

Saved project overview now mirrors the demo detail composition: real project header/status and client/address sidebar, live cost-budget metrics and breakdown, illustrative plan, and live estimate/file sections. Financial amounts are saved integer cents. Site editing and revision-conflict recovery remain available below the overview.

## Project tasks and schedule

Open a saved project → **Tasks / Tâches** to create or edit a task, add optional
start/due dates and notes, and set To do / In progress / Done. Delete requires
confirmation. The **Schedule / Planning** navigation opens the company's weekly
schedule, with separate Overdue and Undated views and links back to each project.
Multi-day tasks appear on each day; single-date tasks appear once. Load more fetches
another 50 matching tasks. Task edits survive a failed save in the current page;
revision conflicts require an explicit reload. Unsaved fields do not survive navigation.

Team assignments, dependencies, Gantt charts, calendar integration and notifications
are not implemented. Sketch examples remain demonstrations, but task
tracking is now connected. See decision 008 and `supabase/tests/task_isolation.sql`.

## Company and account navigation

The live sidebar owns company selection, Add a company, Company settings, demo
access and account sign-out. Projects no longer embeds company administration.
`/workspace?company=<id>` selects the project register; project, schedule and settings
routes carry the company ID in the path. Switching companies returns to that company’s
register. `/workspace/:organizationId/settings` contains document contact details.
Selection is explicit in the URL and survives reload; unqualified `/workspace` uses
the first available membership. No permissions or database schema changed.

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

### Project sketches

Open **My workspace → a saved project → Sketches / Croquis**, enter a name and
create a sketch. Draw with Excalidraw or import a `.excalidraw` file. Wait for
**Saved / Enregistré**, return to the project and reopen the sketch. Embedded
PNG/JPEG/WebP images are included in private storage alongside a PNG preview.

Owners can edit and restore older revisions; members can view and export. History
restoration publishes a new revision. Autosave pauses on errors or conflicts and
keeps the open draft for retry or local export. Limits: 8 MiB and 2,000 elements.
These are rough sketches, not measured CAD. No realtime, offline sync, sketch
deletion or PDF-background import yet. Incomplete uploads remain private and
require a future cleanup policy. The fictional demo stays separate.

The approved sketch migration is applied to the development Supabase project.
`pnpm exec playwright test tests/sketch-editor.spec.ts tests/sketch-storage.spec.ts`
checks the editor and storage integration with mocked APIs.

## Estimate status and decision history

Open a saved estimate as a company owner. Save at least one line, add a communication
reference under **Estimate tracking / Suivi du devis**, then choose **Mark as sent /
Marquer comme envoyé** and confirm. This records communication performed elsewhere;
it does not send an email. Sent content and company/client details become frozen.

You can then record acceptance or decline with another reference. Each action records
its author, time and note. Sent and terminal estimates cannot be edited or reopened;
create a separate draft if work changes. This is owner-recorded tracking, not an
electronic signature. No invoice or automatic budget/revenue update is created.

PDF exports use the frozen snapshot after sending, even if company or site details
change later. Status labels identify decisions as recorded by the company. Existing
draft exports retain their Draft marker. The approved migration is applied and
`supabase/tests/estimate_workflow.sql` passes on the hosted development database.
