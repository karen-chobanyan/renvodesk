# 022 — Fastify for future privileged endpoints

Selected: TypeScript and Fastify for RenvoDesk's custom Node API. The application
remains a Vite frontend backed by Supabase Auth, Postgres, RLS and private Storage.

Introduce the API with the first concrete server-owned feature, such as an AI
workflow that needs a provider secret, project-scoped retrieval or durable work.
Use a pnpm workspace when the API is introduced, keeping the web application and
API as separate packages. Extract a shared package only for contracts that both
applications actually use; do not move all existing browser code into packages.

The API must verify the caller's Supabase identity and authorize each company
and project operation. Preserve database RLS and existing source-of-truth rules;
the API is not an alternative authorization boundary or a replacement for
Postgres-side financial calculations. Keep provider keys and privileged clients
out of the browser bundle. Use service credentials only for narrowly justified
operations with explicit authorization.

Start with focused Fastify routes, request/response validation and domain-level
services. Add a durable worker only when a real workflow needs retries or longer
processing. Queue technology, AI provider, first AI feature and API deployment
details remain undecided. The selected Ubuntu/Nginx hosting target has not been
provisioned for a Node process.

Backend implementation explanations should be detailed and instructional:
describe the request path, Fastify route and plugin boundaries, validation,
authentication, tenant authorization, data access, error handling and tests as
each piece is built. The user is learning Fastify through this project.

## 2026-09-25 implementation update

The root web package and `apps/api` are now a pnpm workspace. A local Fastify
process binds to loopback. Its health route and protected project context route
form the first backend slice. The route verifies a Supabase access token with Auth,
checks owner membership and fetches the requested project with the caller's token
through the Data API, preserving RLS. No service-role key, AI provider, AI output,
schema change, queue, browser integration or production proxy has been added.
See docs/API.md for the request path and limitations. The original hosting note
above is historical; current static hosting uses Nginx and has no API process.

## 2026-09-26 AI implementation update

Decision 029 selects the first local AI workflow and its models: project voice-note transcription with `gpt-transcribe` and a `gpt-6-luna` proposal function call. The API now has an optional provider integration and the browser has an owner review flow behind a disabled-by-default flag. Production API deployment, provider account configuration, and durable processing remain open. This update replaces the earlier provisional statements that the first AI feature and provider were undecided.
