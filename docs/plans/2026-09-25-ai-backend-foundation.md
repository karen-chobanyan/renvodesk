# AI backend foundation

Goal: make the selected Fastify API runnable and testable before adding an AI
provider. This is a local backend milestone, not an AI feature or production
rollout.

- [x] Add a pnpm workspace with the existing Vite application at the root and a
  separate TypeScript/Fastify API package. Keep the current web build working.
- [x] Add a loopback-only API with a health route and one project-scoped AI context
  route. Validate UUID parameters and bearer authentication at the server.
- [x] Verify the access token with Supabase Auth. Use the caller's token for RLS
  reads, check owner membership, and return only bounded project context. Do not
  add service-role credentials, database changes, provider calls or AI output.
- [x] Wire a local Vite `/api` proxy, documented API environment variables and
  commands. Leave the production Nginx configuration untouched until rollout.
- [x] Test missing/invalid authentication, member and cross-company denial,
  missing projects, input validation and successful owner reads. Run lint,
  typecheck, tests and builds.

Follow-on decision: choose the first AI workflow and provider, privacy/retention
terms, usage limits and deployment before processing customer content.

Verification: `pnpm install --frozen-lockfile --offline`, `pnpm lint`,
`pnpm typecheck`, `pnpm test` (67 tests), and `pnpm build` passed. The compiled API
returned 200 on `/api/health` and 401 for a protected request without a token.
The Vite development proxy returned the API health response. Auth and Data API
request tests use synthetic HTTP responses; a live signed-in Supabase request and
production reverse proxy remain unverified.
