# DXF viewer evaluation

Scope: isolated, read-only browser prototype with synthetic fixtures and local
DXF selection. This evaluates MLightCAD before any project/storage integration.
No DWG parser, CAD editing, persistence, takeoff or production feature claims.

- [x] Verify published package versions, licenses and dependency graph (no GPL DWG converter).
- [x] Add an isolated prototype with lazy loading, French/English controls,
  bounded local input, fit/zoom/layers, clear errors and reliable teardown.
- [x] Include a synthetic plan with layers, text and dimensions.
- [x] Verify rendering, reopen, invalid inputs, keyboard and mobile layouts.
- [x] Run relevant checks; document limitations and next integration gate.

Next milestone, after evaluation: private project DXF attachments, coordinated
client/server MIME validation, authorization tests, and project preview integration.
Editing needs a separate proven save/reopen/export design before implementation.


Verified: lint and typecheck passed; 52 existing unit tests passed; normal app
build passed; the separate CAD build and six desktop/mobile browser checks passed.
Visual review confirmed walls, text and native dimension rendering. Browser checks
include keyboard layer toggles, pan and emulated pinch. Physical devices and large
real-world drawings remain unverified. See decision 018 for the findings, bundle
size, dependency licenses and correction concerning the DXF export command.
