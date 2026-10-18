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

The brand uses the architectural lowercase “r” in a dark green (`#203C34`)
rounded square with a warm ivory (`#F5F5EC`) letter and no dot. The single SVG
source is `public/favicon.svg`, shared by the browser favicon and the lightweight
`src/components/brand-mark.tsx` component. Keep it square, with no added padding,
and decorative beside the existing Inter RenvoDesk wordmark. Use the versioned
asset URL in both the component and `index.html` when replacing the artwork.

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
The shell's `.app-content` owns the shared 1700px maximum width and responsive
page gutters. Page components fill that area; narrower widths belong to specific
forms, text blocks or dialogs, not the outer page container.
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
modal. Live and demo schedules share a compact register header, week/overdue/undated
filters, and labeled arrow navigation with a localized compact date range. Task
titles and project names link to the project's Tasks panel. Creation/editing stay
in that panel. Single-day dates appear once; one-sided dates retain start/due
labels, and undated tasks show one clear label.

The week uses seven columns on wide desktops and a chronological daily agenda
below 1250px, avoiding a two-column calendar that breaks week scanning. Empty days
are compact on phones. Empty weeks retain all seven days, with one compact contextual message and a project link below the calendar;
empty personal views offer to clear the assignment filter. Today uses a labeled sage
accent; red is reserved for overdue work. Existing status badges, surface/border
and spacing tokens match Projects and Clients. Counts describe loaded tasks, not
company totals, and multi-day repetition is explained below populated weeks.
French and English are complete. Task previews in the register are replaced by live
schedule links.

## Company and account navigation

The live sidebar owns company selection, Add a company, Company settings, demo
access and account sign-out. Projects no longer embeds company administration.
`/workspace?company=<id>` selects the project register; project, schedule and settings
routes carry the company ID in the path. Switching companies returns to that company’s
register. `/workspace/:organizationId/settings` contains document contact details.
Selection is explicit in the URL and survives reload; unqualified `/workspace` uses
the first available membership. No permissions or database schema changed.

Live sidebar identities use compact avatar/name disclosure rows matching the demo. Company selection, add/settings links and account sign-out are inside keyboard-accessible expandable panels. Escape closes the panel and returns focus to its trigger; mobile drawer remains scrollable.

Company estimates: `/workspace/:organizationId/estimates` uses the same compact
register header, bordered search toolbar and contextual empty states as Projects
and Clients. Title/project/client search and status filters apply on the server
before 20-row pagination; counts describe loaded results. Rows show project/client,
owner-recorded status and EUR amounts excluding tax, stacking without horizontal
scroll on phones. New estimate opens a project/title dialog with paginated project
selection, guarded closing and stable request IDs for interrupted-create recovery.
Saved edits and recorded status changes invalidate the company register. Live and
fictional demo registers share presentation and FR/EN copy, with separate services.

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

The directory shares Projects’ compact header, bordered search control and flat
register styling. Search is explicitly submitted; the adjacent reset clears text,
applied search and type, with a notice when typed text has not yet been applied.
Counts describe loaded clients, not company-wide totals. Desktop rows group contact
links; phone rows retain name, type, email, phone and Edit without sideways scrolling.

Client editing uses a focused dialog with name/type first, paired contact fields and
full-width billing address. Focus returns to the trigger; dirty dismissal requires
confirmation and saving blocks dismissal. Server errors and revision conflicts keep
fields in place. Successful saves clear filters to avoid leaving an excluding
filter active; the directory still uses its existing alphabetical pagination.

Selecting a client opens the existing properties drawer. Show client identity once,
then contact/billing details, then properties. Property editing remains inline and
focuses its first field. Live and fictional directories share presentation components
without sharing services or records. The project creation picker remains separate.

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
demo register grid and must not be reused. The shared shell sets its width and
responsive page gutters. Mobile metrics become label/value rows
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

Documents uses the shared Inter typeface and control radii. The centered dashed
upload target contains an icon, inline Choose a file control and supported-format
hint. Equal outlined photo and voice controls sit below it; no duplicate header
upload action. Selection shows the filename, size, Change/Remove and explicit
Upload action, with local progress and errors. Selecting or capturing never uploads
automatically. Protect selected files, captured media and recording against
unintended navigation or dismissal; stop device use in the background while
retaining the capture for review.

Saved files use a native table with type icons, readable filenames, metadata and
explicit actions. Put the loaded count beside the library heading. Preview/Open
is visible when supported; otherwise show Download. Secondary actions use an
accessible ellipsis disclosure. Explain AI processing in a confirmation dialog
before analyzing an eligible voice note. On phones file rows stack metadata and
actions without horizontal page scrolling, retaining 44px action targets.

The independently sized 320px sketch column has a fine vertical divider and
contained previews in thin bordered interactive tiles. It stacks below files on
narrower screens. New sketch opens a focused, guarded name dialog; interrupted
creation retains its request identity for recovery. Keep preview failures distinct
from actual saved previews, FR/EN copy complete, and hover/drag feedback compatible
with reduced motion. Restore focus when dialogs close.

File and sketch lists retain loaded pages through refresh failures, refresh after
writes and on return, and report independent list, pagination and action errors.
Background reads never replace uploader or sketch-name drafts. Empty states lead
owners to the existing controls and explain read-only access to members. Demo
views share the layout while clearly explaining unavailable upload, capture and
sketch-creation operations.

The full Activity journal spans the project content width. Its 24px heading aligns
with the category filter and labeled Refresh action. Day headings have fine rules;
desktop rows align time, domain icon, event detail, actor and Open action. Narrow
layouts stack metadata while retaining an adjacent action and 44px mobile targets.
The overview retains its compact feed. Reduced-motion disables row transitions.

## PDF reading workspace

Saved PDF previews use a large viewport-bounded dialog and a light paper surface.
The toolbar stays outside the scrolling page: previous/next, page count, relative
zoom (50–200%), fit width and download. At 100%, the page fits the available width
up to a comfortable 1100px reading width. Phones use a full-screen dialog with
wrapped controls. Keep keyboard scrolling, Escape/focus return and FR/EN labels.
PDF.js remains lazy; offscreen rendering isolates cancelled work and limits each
raster to eight million pixels and a 4096px edge. This is a canvas preview, without
text selection/search or document editing. Download retains the original file.

Saved image previews share the large document dialog with PDF previews. Images fit the
available viewing area on open and resize; zoom ranges from 50% to 400% relative to
that fit. The toolbar keeps fit and private download actions visible while the image
scrolls independently. The mobile dialog fills the viewport. French and English
labels, keyboard panning, loading/error feedback and the existing signed-URL expiry
behavior remain part of the image flow.

## Project register

The live and fictional project registers share `ProjectRegisterHeader` and
`ProjectRegisterList`. One compact heading holds schedule and creation actions.
Status filters include counts; a bordered search field, explicit reset and result
count keep filtering understandable. Live counts and search remain scoped to loaded
projects, with that scope stated once and Load more beside the result count.

The register fills the content width without an instructional sidebar or duplicate
summary metrics. Rows prioritize project/client, city and status; a neutral folder
icon does not imply a real drawing preview. On phones the same table rows stack
into readable entries with 44px open actions and no sideways scrolling. Filters
form two columns to keep all statuses visible. Empty/error/loading feedback stays
inside the register. Creating a project clears previous filters so it is visible.
Demo data remains fictional and separate; its financial figures stay on project
and estimate screens rather than the register.

Team uses the compact register header, an Invite teammate action, structured
member rows and loaded counts. Pending invitations are visible first; completed,
revoked and expired invitations sit in an expandable history. Invitation creation
and link retrieval share a focused dialog with keyboard focus restoration, guarded
closing, stable request recovery and manual-copy fallback. Member and invitation
reads recover independently. Demo and live Team screens share these components.

Estimate editors share a contextual header linking the estimate register and its
project, a recorded-status badge and revision, and sticky save/status/PDF actions.
Draft project context uses the existing scoped project read; frozen estimates use
the sent snapshot's project name. Descriptions wrap in textareas. On phones each
line stacks labeled fields with the line total and remove action; no horizontal
scroll is needed. Tracking and decision history remain separate from editing.
Existing revision checks, decimal totals, PDF snapshots and transition rules stay
in place. Reloading over unsaved conflict fields requires confirmation.

Unsaved estimate edits use native `beforeunload` plus the browser Navigation API
for cancelable same-document navigation (including Back/Forward), without replacing
BrowserRouter. Browsers without this API retain link-click and unload prompts;
SPA history traversal protection requires Navigation API support. Inputs remain
memory-only. The demo retains dirty inputs when its language changes.


## Company settings

Settings uses the compact register header and shell content width. A single divided
surface places expanded document contacts first, workspace preferences second and
storage last. Desktop rows pair a narrow heading/help column with readable form
fields; phones stack the same content. Addresses use a textarea and phone fields
use a telephone keyboard. EUR is compact read-only information. Language help links
to personal Account settings; Team and Account shortcuts replace the subscription
placeholder. No new persisted settings fields are added.

Each form owns its draft and original revision until save, cancel or explicit reload.
Background reads and saves in the other section cannot reset edits or advance their
revision. Save is disabled until dirty; Cancel restores the form's loaded values.
Conflicts require a successful explicit reload before saving again. Failed reloads
preserve inputs. One page-level leave guard covers both forms, using the same native
navigation/unload behavior and browser limitations as the estimate editor.

Storage presents the company allowance first and the shared owner-account allowance
second, explains reservations, and offers Refresh with inline recovery. Stale usage
remains visible with an error if refresh fails. Live and fictional settings reuse
forms, layout, copy and storage presentation; demo writes remain in memory.


## Account settings

Account settings shares the compact header and divided Settings surface. The
profile section shows the signed-in email as read-only identity, with name and
personal language fields. Save activates only for edits; Cancel restores saved
values, and subsequent edits clear success feedback. Profile and password forms
save independently, including when a profile save changes the interface language.

Password fields open on demand, with per-field Show/Hide, associated validation
and first-error focus. Recovery stays beside the current-password field. Cancel
clears and closes the form; success does the same and reports confirmation.
Passwords remain in uncontrolled inputs rather than persistent or shared state.
One page-level guard covers both drafts, with the existing navigation limitations.
Live and fictional Account settings reuse presentation and FR/EN copy. Demo profile
changes survive route navigation in memory; password operations remain disabled.

## Project details

Project details uses a compact shared header and a sticky section navigation row.
Overflowing navigation shows a scroll hint on narrow screens. Tabs own section
navigation without a duplicate shortcut row. Creation and capture actions stay in
their relevant sections, including voice capture in Documents. Next tasks leads the
content, with a compact, actionable cost allowance summary beside it on desktop
and directly after it on phones. Estimates, sketches and files use consistent
preview rows. The journal preview is limited to three entries with a full-history
link. Empty states lead to the relevant creation or capture controls.

Project estimates reuse the register table and creation dialog, with the current
project fixed and redundant project columns omitted. Tasks places the company
schedule link with its other actions. Documents uses the centered uploader and
paired outlined capture controls described above. Preview/AI actions remain
visible; secondary file actions sit in an accessible disclosure. AI disclosure and
existing file recovery, preview, expiry and deletion confirmation remain intact.

Overview task/file links focus the matching row. If it falls outside the loaded
page, a separate company/project-scoped read resolves it without changing the
pagination offset. Missing items show recovery feedback. Related task, cost and
file refreshes invalidate the read-only overview while working panels stay mounted.

The shared live/demo project editor owns its base record and revision. Background
query updates cannot overwrite its draft. Save is dirty-aware; Cancel, field errors,
focus and save feedback match Account settings. Conflict reload needs confirmation
and replaces inputs only after a successful read. The existing shared leave guard
covers navigation and unload, with the same older-browser history limitations.

Task creation and editing use the shared task dialog in live and demo projects.
The name receives initial focus; the list stays visible behind the overlay. Fields
use two columns on desktop and one on phones. Save is enabled for changed values;
Cancel, Escape and the close control confirm before discarding edits. Save failures
keep fields and the existing request/revision. Conflicts require an explicit,
confirmed reload. Closing restores focus to the opening control. The existing
navigation/unload guard protects task drafts with its documented browser limits.

## Budget and costs

Live and fictional Budget tabs share one toolbar, compact three-value summary,
responsive cost ledger and independent category breakdown. Add cost is the only
primary section action; Set/Edit budget lives with its amount. Ledger counts refer
to loaded history, including voided costs. Desktop uses aligned table columns;
phones stack labeled fields. Voided entries remain legible with an explicit
excluded-from-totals label and struck amount. Void lives in the secondary disclosure
and confirmation identifies the description and amount. Empty views explain what
to record without duplicating the primary action or displaying four zero categories.

Budget and cost editors reuse the task dialog sizing, keyboard focus and leave guard.
Only one editor opens at a time. Draft fields and the loaded revision remain fixed
through background refreshes; confirmed conflict reload replaces them only after a
successful scoped read. Create retries retain their UUID. Zero budgets remain distinct
from unset budgets. Budget totals use the existing summary RPC, never loaded ledger
rows. No profit, VAT, invoice or commitment calculation is implied.

Summary and paginated ledger reads fail and retry independently, retaining loaded
content. The tab updates after writes and on return to the section/window. Background
updates do not reset an open editor. The manual Refresh toolbar action is removed.
