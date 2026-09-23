# 021 — Retire the standalone CAD prototype

The saved-project DXF preview is now the only CAD viewer entry. The exploratory
`cad-prototype.html` page, its React/CSS implementation, separate Vite and
Playwright configs, package scripts, and generated local build output were
removed. Normal production routes and the project-file permissions are unchanged.

The fictional DXF sample moved to `tests/fixtures/cad-sample.dxf`. Project DXF
browser tests now check rendered walls, labels and dimensions, measured zoom,
fit, layer controls, desktop drag pan, emulated mobile pinch, rapid close/reopen,
owner/member file flows, and error recovery. This keeps the useful renderer
regressions without maintaining a second application entry. Historical evaluation
plans and decisions 018–020 remain for provenance; their prototype commands are
no longer available.

Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (53 tests), `pnpm build`,
and `pnpm exec playwright test tests/project-dxf.spec.ts` (eight desktop/mobile
cases) passed. Browser storage/auth responses are mocked. No VPS deployment or
real Storage delivery was performed.
