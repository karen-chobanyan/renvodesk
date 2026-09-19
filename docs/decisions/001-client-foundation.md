# 001 — Client foundation

Accepted for this scaffold: React + TypeScript + Vite + React Router declarative
routing. Tailwind v4 supplies the utility/token bridge; shared CSS defines the
initial visual system. Radix-backed, locally owned shadcn-style primitives provide
button composition and accessible dialogs. Fontsource serves Inter locally.

Vite 7 and plugin-react 5 are intentionally used for compatibility with the available
Node 20.19 runtime. pnpm-lock.yaml pins resolved dependencies.

The demo store is in-memory React state, separate from feature calculation helpers.
There is no authentication, database, storage upload, server endpoint, invoice
issuance, Excalidraw integration or production authorization in this milestone.

Next: establish Supabase organization/membership schema, explicit role matrix and
RLS tests before replacing demo data. Server-only privileged work must use dedicated
server endpoints or Edge Functions; never put service keys in VITE_* variables.

User correction on 2026-09-19: French and English now, Dutch later.

CSS lint note: descending specificity is disabled for this component-scoped stylesheet
because shared descendant element types in unrelated components trigger false positives.
Reduced-motion overrides explicitly suppress the important-style warning locally.
