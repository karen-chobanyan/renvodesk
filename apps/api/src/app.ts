import Fastify from "fastify";
import type { ProjectContextGateway } from "./project-context.js";
import {
  OpenAIRequestError,
  type SiteNoteAnalyzer,
  validCalendarDate,
} from "./site-note-analysis.js";

const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

interface ProjectParams {
  organizationId: string;
  projectId: string;
}

interface SiteNoteParams extends ProjectParams {
  fileId: string;
}

interface SiteNoteBody {
  today: string;
}

const dayMs = 24 * 60 * 60 * 1000;

// The browser sends its local calendar day so "tomorrow" means the owner's
// tomorrow. Time zones differ from UTC by less than a day in either direction.
function plausibleLocalToday(value: string, now = Date.now()) {
  if (!validCalendarDate(value)) return false;
  const noon = new Date(`${value}T12:00:00Z`).getTime();
  return Math.abs(noon - now) <= dayMs + 12 * 60 * 60 * 1000;
}

function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer ([^\s]+)$/.exec(header ?? "");
  return match?.[1] ?? null;
}

function unavailableReason(error: unknown) {
  if (error instanceof OpenAIRequestError)
    return {
      reason:
        error.step === "transcription"
          ? "transcription_upstream"
          : "proposal_upstream",
      upstreamStatus: error.upstreamStatus,
    };
  if (!(error instanceof Error)) return { reason: "internal_error" };
  const reason = {
    "Supabase Auth request failed": "auth_upstream",
    "Supabase Data API request failed": "data_upstream",
    "Unexpected Supabase Data API response": "data_response_invalid",
    "Unexpected Supabase project response": "project_response_invalid",
    "Unexpected Supabase file response": "file_response_invalid",
    "Unexpected Supabase team response": "team_response_invalid",
    "Supabase Storage download failed": "storage_upstream",
    "Unexpected Supabase Storage object size": "storage_size_mismatch",
    "Invalid AI transcription": "transcription_invalid",
    "Invalid AI response": "proposal_invalid",
    "Missing AI proposal tool call": "proposal_invalid",
    "Invalid AI proposal": "proposal_invalid",
    "Invalid AI task proposal": "proposal_invalid",
  }[error.message];
  return { reason: reason ?? "internal_error" };
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
    return reply
      .code(503)
      .send({ error: "service_unavailable", ...unavailableReason(error) });
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

  app.post<{ Params: SiteNoteParams; Body: SiteNoteBody }>(
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
        body: {
          type: "object",
          required: ["today"],
          additionalProperties: false,
          properties: {
            today: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          },
        },
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      if (!plausibleLocalToday(request.body.today))
        return reply.code(400).send({ error: "invalid_request" });
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
      const members = await gateway.readAssignableMembers(
        caller,
        organizationId,
      );
      return analyzer.analyze({
        ...file.audio,
        project: project.project,
        members,
        today: request.body.today,
      });
    },
  );

  return app;
}
