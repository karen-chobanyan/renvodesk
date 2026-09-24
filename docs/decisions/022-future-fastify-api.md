# 022 — Fastify for future privileged endpoints

Selected: TypeScript and Fastify for RenvoDesk's future custom Node API. The
current application remains a Vite frontend backed by Supabase Auth, Postgres,
RLS and private Storage. No Node API or monorepo is implemented by this decision.

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
