# RenvoDesk design foundation

## Direction
Warm architectural workspace with quiet surfaces, precise typography, and useful
information density. The interface is an operating tool, not a marketing page.

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
search/status filters and counts scoped to loaded projects. Company settings follow
the register. Saved project pages provide links to details, estimates and files.
Task and sketch previews are explicitly fictional; their links lead to demo routes.
The global estimates link is labeled Demo; saved estimates remain inside projects.
Keep demo records separate from live data while replacing previews incrementally.
See docs/decisions/007-shared-workspace-design.md.

Saved project overview now mirrors the demo detail composition: real project header/status and client/address sidebar, explicitly fictional financial metrics and breakdown, illustrative plan, and live estimate/file sections. Example amounts are integer cents, never saved budgets. Site editing and revision-conflict recovery remain available below the overview.
