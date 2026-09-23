# 020 — Direct React CAD viewer

Decision 021 retires the standalone prototype described below. The direct React
canvas remains in the project DXF preview.

The project DXF preview and standalone prototype now mount `CadCanvas` directly
inside their React layouts. The earlier `cad-canvas.html` iframe, message bridge,
and hosting frame exception are removed. `cad-prototype.html` remains an optional
standalone evaluation entry; Vite's normal application build uses `index.html`
as its sole source entry and lazy-loads CAD code when a project plan is opened.

`@mlightcad/cad-simple-viewer` exposes a singleton document manager. A shared
lifecycle queue finishes destruction before another canvas creates the manager.
The component also handles cancellation during font/document loading and React
effect replay. Parents keep the read-only controls, layer state, localized status,
and private download handling. Project previews still cap downloaded bytes at
10 MiB and abort the fetch on close; the signed URL is never sent to the renderer
or persisted. Loaded drawings remain usable after URL expiry.

The direct canvas avoids iframe messaging and an extra HTML route. It does not
isolate CAD parsing from the application's main thread; a complex drawing can
still stall the page. The existing read-only, model-space, font-fidelity and
untrusted-file limitations in decisions 018 and 019 continue to apply. No
permissions, storage policy, database schema or dependency versions changed.

Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm test:cad`, and `pnpm exec playwright test tests/project-dxf.spec.ts`.
The CAD browser suite checks desktop/mobile geometry, labels, dimensions,
zoom/fit, pan/pinch, layers, invalid files, and rapid close/reopen. The project
suite checks owner/member flows, private download, preview recovery and URL
expiry. Browser tests mock Auth/Storage and do not prove real network delivery or
representative customer-DXF performance. No VPS deployment was performed.
