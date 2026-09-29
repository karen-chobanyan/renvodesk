import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalysisStore, BeginOutcome } from "./analysis-store.js";
import { buildApp } from "./app.js";
import type {
  ProjectContext,
  ProjectContextGateway,
  ProjectContextResult,
} from "./project-context.js";
import type { SiteNoteAnalyzer } from "./site-note-analysis.js";
import type { JobRunner } from "./site-note-jobs.js";

const organizationId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const fileId = "44444444-4444-4444-8444-444444444444";
const analysisId = "66666666-6666-4666-8666-666666666666";
const requestId = "77777777-7777-4777-8777-777777777777";
const base = `/api/v1/organizations/${organizationId}/projects/${projectId}`;
const startUrl = `${base}/files/${fileId}/ai-analysis`;
const pollUrl = `${base}/ai-analyses/${analysisId}`;
const statusUrl = `/api/v1/organizations/${organizationId}/ai-status`;
const today = new Date().toISOString().slice(0, 10);
const auth = { authorization: "Bearer token" };
const project: ProjectContext = {
  id: projectId,
  organizationId,
  name: "Kitchen renovation",
  clientName: "Client",
  city: "Brussels",
  address: null,
  status: "active",
  revision: 1,
};
const versions = {
  promptVersion: "0123456789ab",
  transcriptionModel: "gpt-transcribe",
  proposalModel: "gpt-6-luna",
};

function gateway(
  result: ProjectContextResult = { kind: "found", project },
): ProjectContextGateway {
  return {
    authenticate: vi.fn(async (accessToken: string) => ({
      userId: "33333333-3333-4333-8333-333333333333",
      accessToken,
    })),
    readOwnerProject: vi.fn(async () => result),
    readOwnerAudio: vi.fn(),
    readAssignableMembers: vi.fn(),
  };
}

function fakeStore(outcome: BeginOutcome = "created"): AnalysisStore {
  return {
    begin: vi.fn(async () => ({
      analysisId:
        outcome === "created" || outcome === "existing" || outcome === "reused"
          ? analysisId
          : null,
      outcome,
    })),
    advance: vi.fn(),
    complete: vi.fn(),
    fail: vi.fn(),
    read: vi.fn(async () => ({
      id: analysisId,
      status: "transcribing" as const,
    })),
    status: vi.fn(async () => ({ enabled: true, remaining: 12 })),
  };
}

const analyzer = { versions } as SiteNoteAnalyzer;
const apps: ReturnType<typeof buildApp>[] = [];
function appFor(
  gw: ProjectContextGateway,
  store: AnalysisStore,
  withAi = true,
) {
  const runner: JobRunner = { enqueue: vi.fn(), load: vi.fn() };
  const app = buildApp(gw, store, withAi ? analyzer : undefined, { runner });
  apps.push(app);
  return { app, runner };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function start(
  app: ReturnType<typeof buildApp>,
  payload: Record<string, unknown> | null = { requestId, today },
) {
  return app.inject({
    method: "POST",
    url: startUrl,
    headers: auth,
    ...(payload ? { payload } : {}),
  });
}

describe("site-note analysis routes", () => {
  it("starts a job with the caller's token, stable request ID and versions", async () => {
    const gw = gateway();
    const store = fakeStore("created");
    const { app, runner } = appFor(gw, store);
    const response = await start(app);
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ analysisId, status: "queued" });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(store.begin).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "token" }),
      { organizationId, projectId, fileId, requestId, ...versions },
    );
    expect(runner.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisId,
        requestId,
        project,
        fileId,
        today,
      }),
    );
  });

  it("does not run a retried request twice and reuses saved results", async () => {
    const existing = appFor(gateway(), fakeStore("existing"));
    const retry = await start(existing.app);
    expect(retry.statusCode).toBe(202);
    expect(existing.runner.enqueue).not.toHaveBeenCalled();

    const reused = appFor(gateway(), fakeStore("reused"));
    const saved = await start(reused.app);
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toEqual({ analysisId, status: "ready" });
    expect(reused.runner.enqueue).not.toHaveBeenCalled();
  });

  it("maps refusals to bounded HTTP responses without starting work", async () => {
    const cases: [BeginOutcome, number, object][] = [
      ["file_unavailable", 404, { error: "not_found" }],
      ["unsupported_audio", 415, { error: "unsupported_audio" }],
      ["disabled", 403, { error: "ai_disabled" }],
      ["user_running", 429, { error: "limit_reached", limit: "user_running" }],
      [
        "company_daily",
        429,
        { error: "limit_reached", limit: "company_daily" },
      ],
      [
        "global_monthly",
        429,
        { error: "limit_reached", limit: "global_monthly" },
      ],
    ];
    for (const [outcome, code, body] of cases) {
      const { app, runner } = appFor(gateway(), fakeStore(outcome));
      const response = await start(app);
      expect(response.statusCode).toBe(code);
      expect(response.json()).toEqual(body);
      expect(runner.enqueue).not.toHaveBeenCalled();
    }
  });

  it("checks ownership before starting and reports a missing provider key", async () => {
    const store = fakeStore();
    const denied = appFor(gateway({ kind: "forbidden" }), store);
    expect((await start(denied.app)).statusCode).toBe(403);
    const missing = appFor(gateway({ kind: "not_found" }), store);
    expect((await start(missing.app)).statusCode).toBe(404);
    const noKey = appFor(gateway(), store, false);
    const response = await start(noKey.app);
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "ai_unavailable" });
    expect(store.begin).not.toHaveBeenCalled();
  });

  it("rejects bad bodies and implausible dates before authentication", async () => {
    const gw = gateway();
    const { app } = appFor(gw, fakeStore());
    for (const payload of [
      null,
      { today },
      { requestId: "not-a-uuid", today },
      { requestId, today: "2026-02-30" },
      { requestId, today: "1999-01-01" },
    ]) {
      const response = await start(app, payload);
      expect(response.statusCode).toBe(400);
    }
    expect(gw.authenticate).not.toHaveBeenCalled();
  });

  it("polls an owner's analysis within the project", async () => {
    const store = fakeStore();
    const { app } = appFor(gateway(), store);
    const response = await app.inject({
      method: "GET",
      url: pollUrl,
      headers: auth,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: analysisId, status: "transcribing" });
    expect(store.read).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "token" }),
      organizationId,
      projectId,
      analysisId,
    );
    vi.mocked(store.read).mockResolvedValueOnce(null);
    const missing = await app.inject({
      method: "GET",
      url: pollUrl,
      headers: auth,
    });
    expect(missing.statusCode).toBe(404);
    const denied = appFor(gateway({ kind: "forbidden" }), store);
    const forbidden = await denied.app.inject({
      method: "GET",
      url: pollUrl,
      headers: auth,
    });
    expect(forbidden.statusCode).toBe(403);
  });

  it("reports company availability and remaining analyses", async () => {
    const store = fakeStore();
    const { app } = appFor(gateway(), store);
    const response = await app.inject({
      method: "GET",
      url: statusUrl,
      headers: auth,
    });
    expect(response.json()).toEqual({
      configured: true,
      enabled: true,
      remaining: 12,
    });
    vi.mocked(store.status).mockResolvedValueOnce(null);
    const denied = await app.inject({
      method: "GET",
      url: statusUrl,
      headers: auth,
    });
    expect(denied.statusCode).toBe(403);
    const noKey = appFor(gateway(), store, false);
    const off = await noKey.app.inject({
      method: "GET",
      url: statusUrl,
      headers: auth,
    });
    expect(off.json()).toEqual({
      configured: false,
      enabled: false,
      remaining: 0,
    });
    const anonymous = await app.inject({ method: "GET", url: statusUrl });
    expect(anonymous.statusCode).toBe(401);
  });

  it("returns bounded reason codes when the store fails", async () => {
    const store = fakeStore();
    vi.mocked(store.begin).mockRejectedValueOnce(
      new Error("Supabase Data API request failed"),
    );
    const { app } = appFor(gateway(), store);
    const response = await start(app);
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: "service_unavailable",
      reason: "data_upstream",
    });
  });
});
