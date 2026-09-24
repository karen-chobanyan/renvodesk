# RenvoDesk design foundation

## Direction
Warm architectural workspace with quiet surfaces, precise typography, and useful
information density. The interface is an operating tool, not a marketing page.

The public landing page extends this foundation with larger editorial typography,
generous spacing, actual application screenshots, a CAD-style vector drawing and a generated architectural photograph.
Its isolated tokens and responsive styles live in `src/features/landing/landing.css`.
Keep reduced-motion alternatives, explicit fictional-preview labels and clear
signup/demo links. The application continues to use the denser workspace tokens.

## Tokens
Source of truth: `src/styles.css`.
- Canvas `#f8f9f6`, white surfaces, charcoal `#232d2b`.
- Navy action accent `#274c62`; muted sage supports navigation and project status.
- Inter Variable, self-hosted through Fontsource. Tabular numerals for amounts.
- 4px spacing basis, 7px controls, 40px desktop / at least 44px mobile controls.
- Fine borders, minimal shadows. No decorative gradients.

## Components
`src/components/ui` contains locally owned shadcn-style primitives using Radix,
class-variance-authority and semantic CSS. `components.json` establishes the shadcn
registry configuration for future additions. Keep token styling when adding them.
`src/components/shared.tsx` owns page headers, statuses, empty states and the
illustrative floor-plan thumbnail. Thumbnail artwork is not a measured project plan.

## Reference routes
- `/projects`: searchable/filterable list, scoped totals, next steps, create dialog.
- `/projects/:id`: project financial overview and context.
- `/estimates/:id`: editable demo estimate, line-level validation, session saving.
- `/design-system`: tokens, primitives, loading/empty/error/access examples.

## Interaction and accessibility
Native tables, labels, visible focus, skip link, Radix dialog focus management,
text alongside status colors, reduced-motion support. Tables scroll within their
containers on narrow screens. Navigation collapses behind a mobile menu.

French is default; English is selectable. Product copy uses typed translation keys.
Proper names and fictional addresses stay unchanged between locales. Dutch is later.
All demo changes intentionally reset on browser reload. Do not imply persistent or
production-safe behavior. Browser QA is required at desktop and mobile sizes.

## Shared workspace layout

Protected workspace, project and estimate pages reuse the demo application shell.
The saved project register uses the same visual hierarchy and table styles, with
search/status filters and counts scoped to loaded projects. Company settings have a dedicated page. Saved project pages provide links to details, estimates and files.
Saved project sketches have real private previews; task navigation opens the live company schedule.
The global estimates link opens the live company estimate register.
Keep demo records separate from live data while replacing previews incrementally.
See docs/decisions/007-shared-workspace-design.md.

Saved project overview now mirrors the demo detail composition: real project header/status and client/address sidebar, live cost-budget metrics and breakdown, sketch previews, and live estimate/file sections. Financial amounts are saved integer cents. Site editing and revision-conflict recovery remain available below the overview.

## Tasks and planning

Tasks use flat rows with text status badges, dates, notes and an explicit overdue
label. Editing uses existing form controls; deletion uses the shared confirmation
modal. The weekly schedule is seven columns on desktop, two on narrower desktop,
and a stacked daily agenda on phones. Today has a subtle tinted background. Company
identity remains visible; task cards link back to saved projects. French and English
are complete. Task previews in the register are now replaced by live schedule links.

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

## Client directory

Reuse the workspace shell and flat task rows. Client selection reveals a property
column on desktop; stack it below the list on mobile. Editors are inline and reuse
project fields. The project creation picker is optional and clearly explains copied
details. Preserve manual entry and display retry/conflict states in context.

## Team and role-aware workspace

Team administration lives in the compact company menu. Use the existing flat rows,
inline forms and confirmation dialog. Show invitation status and expiry explicitly,
and explain that links are copied rather than emailed. Member views retain the same
shell and project context while hiding owner actions and financial sections. Assignee
selection uses a labeled select with paging; the schedule has an explicit My tasks
filter. An unavailable invitation explains email verification, expiry and revocation.

## Sketch workspace

Saved project pages expose a Croquis/Sketches section with titled rows and actual
private PNG previews. The editor opens as a focused full-width canvas, with a compact
title/save/export toolbar and revision history below. Keep Excalidraw lazy-loaded,
self-host its fonts, and preserve French/English across document navigation.

## Saved project workspace

Saved projects use a compact header and URL-backed Overview, Tasks, Budget & costs,
Estimates, and Documents navigation. Members see operational panels only. The
overview contains a flat financial summary, bounded task/estimate/sketch/file
previews, and independent project context. Detailed ledgers live in their tabs.

Use `project-detail-workspace` for this layout; `project-workspace` belongs to the
demo register grid and must not be reused. Content is capped at 1400px with 32px
desktop / 16px mobile horizontal padding. Mobile metrics become label/value rows
to keep currency amounts intact. Horizontal tab scrolling is local to navigation.
Project editing is a guarded dialog; creation fields open on demand. Keep skeletons
and errors local so one failed request does not remove project context or navigation.

## Project journal

The live project overview uses its right-hand column for the journal. Client/site
details, status and editing stay in the header; the sidebar does not repeat them.
Five recent entries use small domain icons, an action label,
optional record label/status/amount and author/time metadata, grouped by local day.
The Activity tab uses the same rows at a readable maximum width with a labeled
category select, explicit Refresh and Load older activity. Financial filters and
rows are owner-only. Use existing semantic tokens and exact tabular cent formatting.

On narrow screens the context/journal stacks below overview content; the Activity
tab provides direct access without a second sidebar. Links and controls have 44px
minimum touch height on mobile. Keep loading/error/empty states local to the journal;
a failed feed must not remove site identity. Historical deleted rows omit links.

## Navigation sidebar refinement

Live navigation shows the brand, a single company disclosure, primary business
routes and the account disclosure. Omit redundant workspace/resource headings,
Components navigation and repeated connection notices from this sidebar. Explore
demo lives inside the account menu alongside sign-out; the existing footer keeps
the design-system link. Demo routes retain their explicit fictional-data notice.
Company selection, settings/team access, keyboard dismissal and the mobile drawer
keep their existing behavior.

## Project Documents

Documents uses the shared Inter typeface and control radii. A compact upload target
and paired camera/voice actions precede a native file table with name, type, size
and explicit actions. Selection reveals the upload confirmation action; selecting
or capturing a file never uploads it automatically. On phones file rows stack
metadata and actions without horizontal page scrolling.

The narrower sketch column has a fine vertical divider, an aligned creation
control and private previews in thin bordered interactive tiles. It stacks below
files on narrower screens. Keep placeholders distinct from actual saved previews,
FR/EN copy complete, and hover/drag feedback compatible with reduced motion.

The full Activity journal spans the project content width. Its 24px heading aligns
with the category filter and labeled Refresh action. Day headings have fine rules;
desktop rows align time, domain icon, event detail, actor and Open action. Narrow
layouts stack metadata while retaining an adjacent action and 44px mobile targets.
The overview retains its compact feed. Reduced-motion disables row transitions.
