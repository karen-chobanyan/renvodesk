# PDF viewer workspace

Visual thesis: a large light document workspace with crisp boundaries and a compact
navy-accent toolbar, preserving RenvoDesk's established typography and controls.
Content: filename/close, page navigation, zoom/fit width and download, then a single
scrollable page surface. Mobile fills the viewport and wraps controls.
Interaction: explicit page and zoom feedback; native scrolling and existing dialog
focus/escape behavior. No ornamental effects.

- [x] Expand only PDF preview dialogs and keep controls outside the scrolling page.
- [x] Add bounded zoom, responsive fit-width and download using existing private APIs.
- [x] Check real PDF rendering, navigation, zoom, keyboard and mobile with synthetic
  fixtures; run lint/types/build and inspect FR/EN screenshots.

Preserve lazy PDF.js loading, cancellation, URL expiry, permissions, and file lifecycle.
No PDF content alteration, new dependency or database change.

Validation: lint, TypeScript and production build passed (existing large-chunk
warnings). Desktop/mobile file workflows passed using a two-page synthetic PDF:
render, zoom/fit, previous/next bounds, viewer download, keyboard scrolling, Escape,
FR/EN controls and dialog viewport bounds. Storage is mocked; no live delivery claim.
Reviewed populated PDF screenshots. Text selection/search remains outside scope.
