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
