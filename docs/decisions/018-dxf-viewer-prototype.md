# 018 — Isolated DXF viewer evaluation

Historical evaluation milestone. Decision 019 supersedes the build exclusion and
attachment-integration status below; fidelity and resource-limit caveats remain.

The first CAD milestone evaluates `@mlightcad/cad-simple-viewer` 1.7.1 in a
standalone prototype. It is not yet a project Documents feature. Normal production
builds exclude the prototype HTML entries and CAD engine; deployment routes are
unchanged. Excalidraw remains the saved sketch editor.

## Run and verify

- `pnpm dev:cad --port 5176` then open `/cad-prototype.html`.
- `pnpm build:cad` produces `dist-cad-prototype` separately.
- `pnpm test:cad` builds that output and runs desktop/mobile Chromium tests.
  The ordinary application e2e configuration excludes this separate suite.

The prototype opens a synthetic plan or a local UTF-8/text DXF up to 10 MiB.
It offers FR/EN controls, fit, zoom, pan, pinch and layer visibility. No upload,
project persistence, DWG, annotation, geometry editing, takeoff or export UI.
Frozen layers remain disabled. Only model space is presented; sheets/layouts are
not exposed. Drawing labels remain source content, not translated UI.

A fresh iframe owns each viewer instance. Closing/replacing it discards document
state, listeners and WebGL resources; pagehide also requests manager destruction.
Messages check source and origin. This is lifecycle isolation, not a hardened
untrusted-document sandbox. The canvas CSP blocks off-origin resources. There is
no telemetry in either entry. Noto Sans is served locally with existing OFL
attribution; substitution does not promise original font fidelity.

Parsing/rendering uses the main thread. The byte limit and 30-second host timeout
are not guarantees against CPU-heavy or malicious geometry: worker isolation and
complexity limits need evaluation before production uploads. The current sample
is small; real-device performance and representative customer drawings remain
unverified. CAD engine build size is approximately 3.96 MB / 1.06 MB gzip, plus
font/UI assets. It remains lazy-loaded inside the iframe.

## Dependencies and licenses

Pinned peers: data-model 1.14.8, three-renderer 1.7.1, mtext-renderer 0.12.12,
three 0.172.0, lodash-es 4.17.21. Installed CAD packages declare MIT. Other added
licenses include emf-converter (Apache-2.0), polybool (0BSD), idb (ISC).
No LibreDWG/GPL converter, Vue shell, AI plugin or paid parser is installed.
Keep upstream license notices on redistribution. Existing Excalidraw/Radix React
peer warnings remain; installation added no new CAD peer mismatch.

References checked 2026-09-23:
- https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer
- https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md
- Published package manifests and TypeScript declarations for the pinned versions.

Correction to initial research: the README says saving DXF is unsupported, but
published 1.7.1 contains `AcApConvertToDxfCmd` / `AcApDxfConvertor`, calling
`database.dxfOut`. Export is therefore a candidate for the next evaluation, not
an established absence. Edit/save/reopen/export fidelity has NOT been tested.

## Evidence and next gate

The fixture is an original fictional 8 × 6 m model-space plan generated with
ezDXF 1.4.4 in a temporary environment (not an application dependency), with
11 wall lines, four labels and one native dimension plus its anonymous block.
ezDXF's document audit reported no errors. Hand-written incomplete fixtures were
replaced after visual inspection exposed missing model-space ownership.

Built-browser checks verify visible wall/text/dimension pixels, layer visibility,
keyboard toggling, zoom/fit, desktop pan, emulated mobile pinch, close/reopen,
local file loading and recovery from invalid/oversized files. Sample tests assert
no off-origin HTTP requests. Desktop/mobile screenshots were visually inspected.
These checks do not establish universal DXF fidelity or physical-phone performance.

Next gate: evaluate representative synthetic/customer-authorized files, missing
fonts/unsupported entities and resource limits before integrating private project
attachments. That integration needs coordinated storage MIME rules and isolation
tests. Editing requires a separately verified round-trip and revision model.
