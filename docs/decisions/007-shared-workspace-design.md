# Shared application design with progressive live integration

The protected workspace now reuses AppShell from the demo. Keep the architectural
palette, typography, sidebar, responsive drawer, tables and spacing as the product
foundation. Authentication screens retain their dedicated layout.

Saved projects, estimates and files keep their existing data services and access
boundaries. The live register includes local search, status filters and counts over
loaded pages, explicitly labeled as such. Company selection and contact settings
remain available below the register. Project details link to site details, estimates
and files. This change introduces no database or authorization changes.

Unfinished task tracking and sketches appear as labeled fictional previews in the
register's context panel. Links open existing demo routes, where edits remain in
memory. The global estimates navigation is labeled Demo until a live cross-project
estimate register exists; actual saved estimates remain accessible within projects.
Do not mix sample financial figures into live totals or imply that illustrative floor
plans represent uploaded project files. Replace each preview as its backend arrives.

## 2026-10-18 — Project details consistency and draft isolation

Project details now shares a compact header and editor between live and demo, with
sticky section navigation, tasks-first overview, an actionable cost summary and a
three-entry activity preview. The project estimate tab reuses the company register
presentation and creation dialog with a fixed project. File actions use a compact
disclosure and task/file overview links identify a specific record.

Editing captures a local base record/revision on opening. A background project query
may update the header but cannot replace the draft or advance its write revision.
An explicit reload replaces the draft only after a successful scoped read and user
confirmation. One existing navigation guard protects the editor. Live task, cost and
file refresh callbacks refresh only the overview and journal, preserving mounted
working panels. The demo also retains visited panels in memory.

A task/file missing from the first loaded page is resolved through an additional
organization/project/item-filtered read; it does not alter the paginated list offset.
Existing RLS, update revision predicates, cost arithmetic and Storage operations
are unchanged. No schema migration, new permission or provider configuration is
introduced. Mocked tests verify UI/data-call behavior, not live tenant isolation.
