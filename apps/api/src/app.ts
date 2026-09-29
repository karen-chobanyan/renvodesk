import Fastify, { type FastifyServerOptions } from "fastify";
import type { AnalysisStore } from "./analysis-store.js";
import { failureReason } from "./failure-reason.js";
import { authenticate, ownerProject, uuid } from "./http.js";
import type { ProjectContextGateway } from "./project-context.js";
import type { SiteNoteAnalyzer } from "./site-note-analysis.js";
import { createJobRunner, type JobRunner } from "./site-note-jobs.js";
import { registerSiteNoteRoutes } from "./site-note-routes.js";

interface ProjectParams {
  organizationId: string;
  projectId: string;
}

export interface AppOptions {
  // Pino options for production; tests pass false. Request logging is off:
  // URLs contain record IDs, so only explicit job events are logged.
  logger?: FastifyServerOptions["logger"];
  maxConcurrentJobs?: number;
  jobDeadlineMs?: number;
  // Tests may inject a runner; otherwise one is created with the app logger.
  runner?: JobRunner;
}

export function buildApp(
  gateway: ProjectContextGateway,
  store: AnalysisStore,
  analyzer?: SiteNoteAnalyzer,
  options: AppOptions = {},
) {
  const app = Fastify({
    logger: options.logger ?? false,
    disableRequestLogging: true,
    bodyLimit: 64 * 1024,
  });

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
    const reason = failureReason(error);
    app.log.warn(reason, "request_failed");
    return reply.code(503).send({ error: "service_unavailable", ...reason });
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
          properties: { organizationId: uuid, projectId: uuid },
        },
      },
    },
    async (request, reply) => {
      const caller = await authenticate(gateway, request, reply);
      if (!caller) return reply;
      const { organizationId, projectId } = request.params;
      const project = await ownerProject(
        gateway,
        caller,
        organizationId,
        projectId,
        reply,
      );
      if (!project) return reply;
      return { project };
    },
  );

  registerSiteNoteRoutes(app, {
    gateway,
    store,
    ai: analyzer && {
      analyzer,
      runner:
        options.runner ??
        createJobRunner({
          gateway,
          store,
          analyzer,
          logger: app.log,
          maxConcurrent: options.maxConcurrentJobs ?? 4,
          // Shorter than the database lease (300 s), so a stuck job fails
          // itself before its lease can be considered expired.
          deadlineMs: options.jobDeadlineMs ?? 240_000,
        }),
    },
  });

  return app;
}
