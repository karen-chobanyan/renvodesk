import Fastify from "fastify";
import type { ProjectContextGateway } from "./project-context.js";
import type { SiteNoteAnalyzer } from "./site-note-analysis.js";

const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

interface ProjectParams {
  organizationId: string;
  projectId: string;
}

interface SiteNoteParams extends ProjectParams {
  fileId: string;
}

function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer ([^\s]+)$/.exec(header ?? "");
  return match?.[1] ?? null;
}

export function buildApp(
  gateway: ProjectContextGateway,
  analyzer?: SiteNoteAnalyzer,
) {
  const app = Fastify({ logger: false, bodyLimit: 64 * 1024 });

  app.setErrorHandler((error, _request, reply) => {
    if (
      typeof error === "object" &&
      error !== null &&
      ("validation" in error ||
        ("statusCode" in error &&
          typeof error.statusCode === "number" &&
          error.statusCode >= 400 &&
          error.statusCode < 500))
    ) {
      return reply.code(400).send({ error: "invalid_request" });
    }
    return reply.code(503).send({ error: "service_unavailable" });
  });

  app.get("/api/health", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    return { status: "ok" };
  });

  app.get<{ Params: ProjectParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/ai-context",
    {
      schema: {
        params: {
          type: "object",
          required: ["organizationId", "projectId"],
          additionalProperties: false,
          properties: {
            organizationId: { type: "string", pattern: uuidPattern },
            projectId: { type: "string", pattern: uuidPattern },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["project"],
            properties: {
              project: {
                type: "object",
                required: [
                  "id",
                  "organizationId",
                  "name",
                  "clientName",
                  "city",
                  "address",
                  "status",
                  "revision",
                ],
                properties: {
                  id: { type: "string" },
                  organizationId: { type: "string" },
                  name: { type: "string" },
                  clientName: { type: "string" },
                  city: { type: "string" },
                  address: { type: ["string", "null"] },
                  status: { type: "string" },
                  revision: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      const token = bearerToken(request.headers.authorization);
      if (!token) return reply.code(401).send({ error: "unauthorized" });

      const caller = await gateway.authenticate(token);
      if (!caller) return reply.code(401).send({ error: "unauthorized" });

      const { organizationId, projectId } = request.params;
      const result = await gateway.readOwnerProject(
        caller,
        organizationId,
        projectId,
      );
      if (result.kind === "forbidden") {
        return reply.code(403).send({ error: "forbidden" });
      }
      if (result.kind === "not_found") {
        return reply.code(404).send({ error: "not_found" });
      }
      return { project: result.project };
    },
  );

  app.post<{ Params: SiteNoteParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/files/:fileId/ai-analysis",
    {
      schema: {
        params: {
          type: "object",
          required: ["organizationId", "projectId", "fileId"],
          additionalProperties: false,
          properties: {
            organizationId: { type: "string", pattern: uuidPattern },
            projectId: { type: "string", pattern: uuidPattern },
            fileId: { type: "string", pattern: uuidPattern },
          },
        },
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      const token = bearerToken(request.headers.authorization);
      if (!token) return reply.code(401).send({ error: "unauthorized" });
      const caller = await gateway.authenticate(token);
      if (!caller) return reply.code(401).send({ error: "unauthorized" });
      const { organizationId, projectId, fileId } = request.params;
      const project = await gateway.readOwnerProject(
        caller,
        organizationId,
        projectId,
      );
      if (project.kind === "forbidden")
        return reply.code(403).send({ error: "forbidden" });
      if (project.kind === "not_found")
        return reply.code(404).send({ error: "not_found" });
      if (!analyzer) return reply.code(503).send({ error: "ai_unavailable" });
      const file = await gateway.readOwnerAudio(
        caller,
        organizationId,
        projectId,
        fileId,
      );
      if (file.kind === "not_found")
        return reply.code(404).send({ error: "not_found" });
      if (file.kind === "unsupported")
        return reply.code(415).send({ error: "unsupported_audio" });
      return analyzer.analyze({ ...file.audio, project: project.project });
    },
  );

  return app;
}
