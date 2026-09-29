# Fastify API foundation

The first custom server package is `apps/api`. It exposes a narrow project
context read and an optional AI site-note analysis route. The AI route calls
OpenAI only when the server has a key; analysis output stays in the active
browser page and is not persisted. The API does not run in production.
Supabase remains the Auth, Postgres, RLS and Storage backend.

## Local setup

Use Node 20.19+ and pnpm 10. Copy `apps/api/.env.example` to
`apps/api/.env.local` and fill in the development Supabase URL and **publishable**
key. Do not put a service-role/secret key there. The API only accepts HTTPS
Supabase origins, except loopback HTTP for local Supabase.

For local AI testing, set `OPENAI_API_KEY` in `apps/api/.env.local` and
`VITE_AI_SITE_NOTES_ENABLED=true` in the root `.env.local`. The latter is only
a public UI flag; the key must never use a `VITE_` prefix. These settings make
real paid provider calls when an owner requests analysis. Do not use customer
recordings until the provider terms, data-processing settings, permissions and
region eligibility have been checked. The optional `OPENAI_API_ORIGIN` accepts
only `https://api.openai.com` or `https://eu.api.openai.com`. The EU endpoint
requires an eligible OpenAI organization and its required retention controls;
setting the URL alone does not establish EU processing eligibility.

Run these in separate terminals from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev:api
pnpm dev
```

Fastify binds only to `127.0.0.1:3001` by default. Vite proxies `/api` to that
port during development. `GET http://127.0.0.1:5173/api/health` checks the local
process; it does not test Supabase connectivity. `API_PORT` can change the API
port, but the Vite proxy currently expects 3001.

`pnpm typecheck`, `pnpm test`, `pnpm lint` and `pnpm build` include the API. After
building, run its compiled entry with environment variables supplied by the
process manager, or locally with:

```sh
node --env-file=apps/api/.env.local apps/api/dist/server.js
```

## First protected route

`GET /api/v1/organizations/:organizationId/projects/:projectId/ai-context`
requires `Authorization: Bearer <Supabase access token>`. Both IDs must be UUIDs.
It returns the selected project's id, company id, name, client name, city,
address, status and revision. The response is marked `Cache-Control: no-store`.
This is server-side input preparation, not AI-generated content.

Request path:

1. Fastify validates the route parameters and bearer header.
2. The server sends the token to Supabase Auth `/auth/v1/user` and rejects an
   invalid or anonymous user.
3. It reads the caller's owner membership for the requested company through the
   Supabase REST API. A member or outsider cannot continue to project data.
4. It reads that project with **both** company and project filters. Both database
   calls use the caller's bearer token and the publishable key, so existing grants
   and RLS still enforce row access. The server has no privileged key.
5. It returns only the bounded project fields above. Missing projects return 404;
   denied access returns 403. A 503 includes a bounded `reason` code without
   exposing provider, database or storage response bodies.

Fastify's route in `apps/api/src/app.ts` owns HTTP validation and status codes.
`apps/api/src/supabase-gateway.ts` owns Auth and data access. The gateway takes a
`fetch` implementation so tests can inspect exact headers and filters without
customer data or network calls. Fastify `inject` tests exercise the route without
opening a port.

## Site-note analysis route

For the complete owner journey, call sequence, validation, data lifetime and
failure behavior, see [decision 029](decisions/029-ai-site-notes.md).

`POST /api/v1/organizations/:organizationId/projects/:projectId/files/:fileId/ai-analysis`
requires the same bearer token and owner check as the project context route.
The gateway queries one ready project file with all three IDs, using the
caller's token and publishable key. It accepts WebM and MP4/M4A audio up to
10 MiB. Ogg remains a supported project attachment but is not supported by
this transcription route. The gateway downloads the private object through
Supabase Storage with the same token and verifies its byte count. It never
trusts an object path supplied by the browser.

The model instructions live in `apps/api/prompts/site-note-instructions.md`.
The API reads that file once at startup, so restart `pnpm dev:api` after
editing it, and deploy the `prompts/` folder next to `dist/`.

The server sends the audio to `gpt-transcribe`. It then asks `gpt-6-luna` for
one forced `propose_site_note` function call. The function is a constrained
review proposal with a summary and up to five tasks, each with a title, notes,
supporting text, and an optional assignee and start/due dates. The browser
sends its local calendar day as `{ "today": "YYYY-MM-DD" }`; the server rejects
a date more than about a day away from its clock with 400. The gateway reads
the first 50 team members through the `team_members` RPC with the caller token;
the model sees opaque `member_N` keys and e-mail local parts only, and the server
maps keys back to user IDs. Unknown keys and invalid or reversed dates are
dropped rather than trusted. A malformed team response returns
`team_response_invalid`. The server parses and validates the function arguments;
it does **not** execute a task write. Both requests run server-side. Responses
use `Cache-Control: no-store`, and the text request sets `store: false`. The
server omits invalid or excess task suggestions and reports how many it omitted.
If the proposal is malformed, it returns the valid transcript with
`proposalStatus: "unavailable"` rather than discarding the transcription.

The owner starts analysis from a ready audio file in Project Documents, reads
the transcript and suggestions, edits each proposed task, and clicks **Create
this task** separately. That action uses the existing task service with one
stable request UUID per suggestion. No task is created merely by transcribing,
and the analysis is lost on reload. Repeating analysis makes another provider
request and can incur another charge; durable result caching, rate limits and
background processing are still required before production.

For a local `service_unavailable` response, inspect its `reason` field. The
codes identify the failed stage: `auth_upstream`, `data_upstream`,
`storage_upstream`, `storage_size_mismatch`, `transcription_upstream`,
`transcription_invalid`, `proposal_upstream`, `proposal_invalid`, or
`internal_error`. A failed OpenAI HTTP request also includes its numeric
`upstreamStatus`. These codes are for troubleshooting; they do not include the
recording, transcript, token, signed URL or raw upstream error. If a request
started before this diagnostic change, restart `pnpm dev:api` and retry once
to get a reason. Each retry may incur another provider charge.

No cross-origin access is enabled. Production Nginx does not proxy `/api` and
the API is not deployed; configure and verify the loopback process, reverse
proxy, provider eligibility and budget controls as part of rollout.
