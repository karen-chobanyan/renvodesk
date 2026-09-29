import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  Caller,
  ProjectContext,
  ProjectContextGateway,
} from "./project-context.js";

export const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

export const uuid = { type: "string", pattern: uuidPattern } as const;

export function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer ([^\s]+)$/.exec(header ?? "");
  return match?.[1] ?? null;
}

// Verifies the bearer token with Supabase Auth. On failure it sends 401 and
// returns null, so handlers can simply `if (!caller) return reply`.
export async function authenticate(
  gateway: ProjectContextGateway,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<Caller | null> {
  const token = bearerToken(request.headers.authorization);
  const caller = token ? await gateway.authenticate(token) : null;
  if (!caller) reply.code(401).send({ error: "unauthorized" });
  return caller;
}

// Owner membership plus company-scoped project lookup; sends 403/404 itself.
export async function ownerProject(
  gateway: ProjectContextGateway,
  caller: Caller,
  organizationId: string,
  projectId: string,
  reply: FastifyReply,
): Promise<ProjectContext | null> {
  const result = await gateway.readOwnerProject(
    caller,
    organizationId,
    projectId,
  );
  if (result.kind === "found") return result.project;
  reply
    .code(result.kind === "forbidden" ? 403 : 404)
    .send({ error: result.kind });
  return null;
}
