import type { FastifyInstance } from "fastify";
import type { AnalysisStore, BeginOutcome } from "./analysis-store.js";
import { authenticate, ownerProject, uuid } from "./http.js";
import type { ProjectContextGateway } from "./project-context.js";
import {
  type SiteNoteAnalyzer,
  validCalendarDate,
} from "./site-note-analysis.js";
import type { JobRunner } from "./site-note-jobs.js";

export interface SiteNoteRouteDeps {
  gateway: ProjectContextGateway;
  store: AnalysisStore;
  // Absent when no provider key is configured; the routes then report it.
  ai?: { analyzer: SiteNoteAnalyzer; runner: JobRunner };
}

interface OrgParams {
  organizationId: string;
}
interface ProjectParams extends OrgParams {
  projectId: string;
}
interface FileParams extends ProjectParams {
  fileId: string;
}
interface AnalysisParams extends ProjectParams {
  analysisId: string;
}

const dayMs = 24 * 60 * 60 * 1000;

// The browser sends its local calendar day so "tomorrow" means the owner's
// tomorrow. Time zones differ from UTC by less than a day in either direction.
function plausibleLocalToday(value: string, now = Date.now()) {
  if (!validCalendarDate(value)) return false;
  const noon = new Date(`${value}T12:00:00Z`).getTime();
  return Math.abs(noon - now) <= dayMs + 12 * 60 * 60 * 1000;
}

function params(...names: string[]) {
  return {
    type: "object",
    required: names,
    additionalProperties: false,
    properties: Object.fromEntries(names.map((name) => [name, uuid])),
  } as const;
}

// Outcomes of begin_site_note_analysis that do not start a job.
const refusals: Partial<
  Record<BeginOutcome, { code: number; body: Record<string, string> }>
> = {
  file_unavailable: { code: 404, body: { error: "not_found" } },
  unsupported_audio: { code: 415, body: { error: "unsupported_audio" } },
  disabled: { code: 403, body: { error: "ai_disabled" } },
  user_running: {
    code: 429,
    body: { error: "limit_reached", limit: "user_running" },
  },
  company_daily: {
    code: 429,
    body: { error: "limit_reached", limit: "company_daily" },
  },
  global_monthly: {
    code: 429,
    body: { error: "limit_reached", limit: "global_monthly" },
  },
};

export function registerSiteNoteRoutes(
  app: FastifyInstance,
  { gateway, store, ai }: SiteNoteRouteDeps,
) {
  // Every AI response is private and must not be cached by any proxy.
  app.addHook("onSend", async (request, reply) => {
    if (request.url.startsWith("/api/v1/"))
      reply.header("Cache-Control", "no-store");
  });

  app.get<{ Params: OrgParams }>(
    "/api/v1/organizations/:organizationId/ai-status",
    { schema: { params: params("organizationId") } },
    async (request, reply) => {
      const caller = await authenticate(gateway, request, reply);
      if (!caller) return reply;
      if (!ai) return { configured: false, enabled: false, remaining: 0 };
      const status = await store.status(caller, request.params.organizationId);
      if (!status) return reply.code(403).send({ error: "forbidden" });
      return { configured: true, ...status };
    },
  );

  // Starts (or finds) an analysis. 202 means a job is queued or running;
  // 200 means a saved result for the same file and versions was reused.
  app.post<{ Params: FileParams; Body: { requestId: string; today: string } }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/files/:fileId/ai-analysis",
    {
      schema: {
        params: params("organizationId", "projectId", "fileId"),
        body: {
          type: "object",
          required: ["requestId", "today"],
          additionalProperties: false,
          properties: {
            requestId: uuid,
            today: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          },
        },
      },
    },
    async (request, reply) => {
      const { requestId, today } = request.body;
      if (!plausibleLocalToday(today))
        return reply.code(400).send({ error: "invalid_request" });
      const caller = await authenticate(gateway, request, reply);
      if (!caller) return reply;
      const { organizationId, projectId, fileId } = request.params;
      const project = await ownerProject(
        gateway,
        caller,
        organizationId,
        projectId,
        reply,
      );
      if (!project) return reply;
      if (!ai) return reply.code(503).send({ error: "ai_unavailable" });

      const { analysisId, outcome } = await store.begin(caller, {
        organizationId,
        projectId,
        fileId,
        requestId,
        ...ai.analyzer.versions,
      });
      const refusal = refusals[outcome];
      if (refusal) return reply.code(refusal.code).send(refusal.body);
      if (!analysisId) throw new Error("Unexpected Supabase analysis response");
      if (outcome === "reused") return { analysisId, status: "ready" };
      // "existing" is a retry of a job already started; do not run it twice.
      if (outcome === "created")
        ai.runner.enqueue({
          caller,
          analysisId,
          requestId,
          project,
          fileId,
          today,
        });
      return reply.code(202).send({ analysisId, status: "queued" });
    },
  );

  app.get<{ Params: AnalysisParams }>(
    "/api/v1/organizations/:organizationId/projects/:projectId/ai-analyses/:analysisId",
    { schema: { params: params("organizationId", "projectId", "analysisId") } },
    async (request, reply) => {
      const caller = await authenticate(gateway, request, reply);
      if (!caller) return reply;
      const { organizationId, projectId, analysisId } = request.params;
      if (
        !(await ownerProject(gateway, caller, organizationId, projectId, reply))
      )
        return reply;
      const view = await store.read(
        caller,
        organizationId,
        projectId,
        analysisId,
      );
      if (!view) return reply.code(404).send({ error: "not_found" });
      return view;
    },
  );
}
