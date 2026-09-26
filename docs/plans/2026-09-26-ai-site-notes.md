# AI site-note transcription and task proposals

- [x] Add an authenticated, owner-only Fastify endpoint that reads a ready audio file from the requested project using the caller's Supabase token.
- [x] Send supported audio to `gpt-transcribe`, then ask `gpt-6-luna` to call a constrained proposal tool. Validate provider output on the server; no provider credential reaches the browser.
- [x] Let owners request analysis from a saved voice note, read the transcript, edit proposed tasks, and explicitly create them through the existing task service.
- [x] Test owner/member/cross-project denial, invalid files, malformed provider output, and the browser review flow. Run lint, types, unit tests and relevant browser tests.

The first release keeps analysis results in the active page only. It makes no automatic task writes or background jobs. Production use needs the API deployment, provider key and data-processing configuration.

Verification on 2026-09-26: `pnpm lint`, `pnpm typecheck`, `pnpm test` (73 tests), and `pnpm build` passed. Targeted Playwright tests passed in Chromium desktop and mobile (6 cases total) for owner review, member controls, and voice capture. Provider calls and live Supabase Storage delivery were mocked; no real recording was sent to OpenAI. Production privacy, quota/rate and idempotency controls remain rollout work.

Review follow-up: Playwright now always starts its configured Vite server, so the AI browser test uses its feature flag. Proposal validation checks that each evidence passage appears in the transcript. `pnpm lint`, `pnpm typecheck`, `pnpm test` (74 tests), and the targeted Playwright test (desktop and mobile) passed after these changes.

Documentation follow-up: decision 029 now records the full user interaction, system call sequence, authorization and validation logic, data lifetime, failure behavior and remaining production limits. Decision 028 points to the later AI decision, and `docs/API.md` links to the walkthrough.
