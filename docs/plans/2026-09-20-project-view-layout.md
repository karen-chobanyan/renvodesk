# Project detail layout — review and improvement plan

Status: implemented.

## Evidence

Reviewed saved-project-page, saved-project-overview, ProjectCosts, TaskPanel,
project sketch entry points, shared styles and DESIGN.md. Re-ran the existing cost
flow on desktop/mobile; both passed and generated fresh screenshots using fixtures.
The in-app browser runtime could not start, so this is not a visual inspection of
the user's live project data.

Current composition: header/status → full financial metrics/breakdown/ledger with
project details alongside → anchor navigation → permanently open project edit form
→ sketches/create form → tasks → estimates/create form → files. Navigation order
and DOM content order disagree. Even a one-cost fixture places navigation below
the first desktop viewport. The return link says companies but leads to projects.
Project details are coupled to cost loading: the owner sidebar vanishes when the
cost summary fails. Broad company-form width rules constrain otherwise unrelated
sections; unlimited overall width creates uneven alignment on wide screens.

## Proposed composition

Projects / Project name
Project name + status                 Edit details / Add action menu
Client · site address
Overview | Tasks | Budget & costs | Estimates | Documents

Overview (desktop: main column + 280–320px context column)
- Owner-only compact strip: cost budget / actual costs / remaining budget.
- Next tasks, with dates, assignees and explicit overdue status.
- Short estimate summary for owners; saved sketches/documents preview.
- Context column: client, site, status and links to relevant saved records.
- Empty states explain the next action; no fabricated metrics or illustrations.

Tasks: full task panel and clearly labeled company schedule link.
Budget & costs: full category breakdown, ledger and financial editors.
Estimates: full list, accurate workflow statuses, create action on demand.
Documents: Files and Sketches subsections, retaining the dedicated drawing editor.
Edit details: existing validated editor in a dialog/sheet, not a permanent section.

## Implementation sequence

- [x] Phase 1: introduce ProjectHeader and role-aware ProjectNavigation immediately
  below the header. Correct Projects breadcrumb/back label. Use URL-backed tabs;
  map existing #project-* links to the appropriate tab to preserve incoming links.
- [x] Phase 1: extract CostSummary from the full cost ledger and decouple project
  context from financial loading/errors. Preserve owner-only data access and RPC totals.
- [x] Phase 1: move existing working panels into their matching tabs. Load panels
  when opened; retain draft state or warn before leaving dirty panels. Support browser
  back/forward, refresh and keyboard focus. Do not silently discard edits on tab switches.
- [x] Phase 2: add a compact read-only overview using existing saved data. Show
  bounded previews, not full ledgers. Do not label loaded counts as company/project
  totals. Avoid client-side fake profitability until the financial model is implemented.
- [x] Phase 2: move project editing and create forms behind named actions. One
  visually dominant action per active panel; place refresh and destructive controls
  at secondary emphasis. Preserve dialogs, confirmations and revision conflicts.
- [x] Phase 3: align spacing, typography, empty/loading/error states and responsive
  behavior. Update DESIGN.md, removing stale references to fictional live sketches.
- [x] Verify desktop/mobile, French/English, long names, empty/populated projects,
  owner/member roles, slow/failed independent sections, and unsaved edits.

## Visual and interaction specification

- Keep the established warm neutral/charcoal/navy/sage application identity. Apply
  the skill's hierarchy, purposeful asymmetry and restrained surfaces to this ERP.
- Content max-width 1400px; desktop padding 32px, mobile 16px. Use a 4/8px spacing
  scale, 24–32px section gaps, 28–32px page title and 16–18px section titles.
- Use a flat divided metric strip and rows, not repeated equal-size card boxes.
- Desktop overview grid: minmax(0,1fr) + 280–320px context; collapse to one column
  on smaller screens. Essential client/site details stay visible in the header.
- Tab bar remains reachable and may stick below the app header. Mobile tabs scroll
  within their own container, with a visible active item; no document overflow.
- 44px mobile controls; labels above inputs; readable body text and tabular amounts.
- Skeletons match final sections. Inline errors retry only their section; one failed
  financial request must not remove project identity, navigation or tasks.
- Use brief opacity/transform feedback and reduced-motion support. No perpetual
  decorative motion or automatic reordering of operational records.
- A Geist typography refresh can be a separate application-wide design decision;
  avoid changing the font on just this project page or adding an animation library
  solely for this layout work. Existing project identity takes priority over a
  marketing-style interpretation of the skill's defaults.

## Acceptance targets

At 1440×1000 and 390×844, project identity, status and section navigation are visible
without scrolling. Overview shows useful task/financial context within the first
screen where content length permits. No permanently open create/edit forms on entry.
All current actions and deep links remain accessible. Members never fetch financial
panels. Existing pagination, optimistic conflict protection and storage policies remain
intact. No database migrations are expected for Phase 1; any new summary queries in
Phase 2 must preserve real data semantics and receive appropriate isolation checks.

## Implementation notes

The saved project page now defaults to an overview with header-first URL navigation.
Visited working panels remain mounted but hidden to retain in-page drafts; overview
summaries reload when revisited. The project editor uses the existing Radix dialog
and confirms dismissal of unsaved edits. Creation forms use keyboard-accessible
disclosures. Existing hash links map to their corresponding panels.

CostSummary is independent of the ledger and project context. Preview queries are
company/project scoped; tasks exclude completed records and are ordered by due date
with a server limit of three, and ready file previews are limited server-side.
Estimates/sketches display bounded samples from their existing paginated services.
Assignees use the existing team directory and a fallback when outside its loaded page.
No schema, permission or dependency changes were needed.

Visual QA reviewed fresh desktop/mobile fixtures. Browser coverage includes initial
nav visibility, hidden entry forms, query/hash navigation, back/forward, retained task
and sketch drafts, project-edit dismissal, section failure isolation, long project
names, both locales, and existing owner/member workflows.
