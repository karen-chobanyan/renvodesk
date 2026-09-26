import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import type {
  ProjectContextGateway,
  ProjectContextResult,
} from "./project-context.js";
import type { SiteNoteAnalyzer } from "./site-note-analysis.js";

const organizationId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const path = `/api/v1/organizations/${organizationId}/projects/${projectId}/ai-context`;

function gateway(result: ProjectContextResult): ProjectContextGateway {
  return {
    authenticate: vi.fn(async (accessToken: string) => ({
      userId: "33333333-3333-4333-8333-333333333333",
      accessToken,
    })),
    readOwnerProject: vi.fn(async () => result),
    readOwnerAudio: vi.fn(async () => ({ kind: "not_found" as const })),
  };
}

const apps: ReturnType<typeof buildApp>[] = [];
function appFor(gw: ProjectContextGateway, analyzer?: SiteNoteAnalyzer) {
  const app = buildApp(gw, analyzer);
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("API routes", () => {
  it("serves a public health check without project data", async () => {
    const app = appFor(gateway({ kind: "forbidden" }));
    const response = await app.inject({ method: "GET", url: "/api/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("rejects malformed IDs and missing or malformed bearer tokens", async () => {
    const gw = gateway({ kind: "forbidden" });
    const app = appFor(gw);
    const badId = await app.inject({
      method: "GET",
      url: "/api/v1/organizations/not-a-uuid/projects/also-bad/ai-context",
    });
    expect(badId.statusCode).toBe(400);
    expect(badId.json()).toEqual({ error: "invalid_request" });

    for (const authorization of [undefined, "Basic abc", "Bearer two tokens"]) {
      const response = await app.inject({
        method: "GET",
        url: path,
        headers: authorization ? { authorization } : {},
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: "unauthorized" });
    }
    expect(gw.authenticate).not.toHaveBeenCalled();
  });

  it("rejects an unverified Supabase token", async () => {
    const gw = gateway({ kind: "forbidden" });
    vi.mocked(gw.authenticate).mockResolvedValue(null);
    const response = await appFor(gw).inject({
      method: "GET",
      url: path,
      headers: { authorization: "Bearer invalid" },
    });
    expect(response.statusCode).toBe(401);
    expect(gw.readOwnerProject).not.toHaveBeenCalled();
  });

  it("keeps members and outsiders out of owner context", async () => {
    const gw = gateway({ kind: "forbidden" });
    const response = await appFor(gw).inject({
      method: "GET",
      url: path,
      headers: { authorization: "Bearer valid-token" },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "forbidden" });
    expect(gw.readOwnerProject).toHaveBeenCalledWith(
      {
        userId: "33333333-3333-4333-8333-333333333333",
        accessToken: "valid-token",
      },
      organizationId,
      projectId,
    );
  });

  it("returns 404 for a missing project and bounded context for an owner", async () => {
    const missing = await appFor(gateway({ kind: "not_found" })).inject({
      method: "GET",
      url: path,
      headers: { authorization: "Bearer valid-token" },
    });
    expect(missing.statusCode).toBe(404);

    const project = {
      id: projectId,
      organizationId,
      name: "Kitchen renovation",
      clientName: "Example client",
      city: "Brussels",
      address: null,
      status: "planning",
      revision: 2,
    };
    const found = await appFor(gateway({ kind: "found", project })).inject({
      method: "GET",
      url: path,
      headers: { authorization: "Bearer valid-token" },
    });
    expect(found.statusCode).toBe(200);
    expect(found.json()).toEqual({ project });
    expect(found.headers["cache-control"]).toBe("no-store");
  });

  it("does not disclose upstream errors", async () => {
    const gw = gateway({ kind: "forbidden" });
    vi.mocked(gw.readOwnerProject).mockRejectedValue(
      new Error("private database detail"),
    );
    const response = await appFor(gw).inject({
      method: "GET",
      url: path,
      headers: { authorization: "Bearer valid-token" },
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "service_unavailable" });
  });

  it("analyzes only an owner's ready project audio after authorization", async () => {
    const project = {
      id: projectId,
      organizationId,
      name: "Kitchen renovation",
      clientName: "Client",
      city: "Brussels",
      address: null,
      status: "active",
      revision: 1,
    };
    const fileId = "44444444-4444-4444-8444-444444444444";
    const url = `/api/v1/organizations/${organizationId}/projects/${projectId}/files/${fileId}/ai-analysis`;
    const analyzer = {
      analyze: vi.fn(async () => ({
        transcript: "Vérifier la fenêtre.",
        summary: "Fenêtre à vérifier.",
        tasks: [
          {
            title: "Vérifier la fenêtre",
            notes: "",
            evidence: "Vérifier la fenêtre",
          },
        ],
      })),
    };
    const denied = gateway({ kind: "forbidden" });
    const deniedResponse = await appFor(denied, analyzer).inject({
      method: "POST",
      url,
      headers: { authorization: "Bearer token" },
    });
    expect(deniedResponse.statusCode).toBe(403);
    expect(denied.readOwnerAudio).not.toHaveBeenCalled();
    expect(analyzer.analyze).not.toHaveBeenCalled();

    const allowed = gateway({ kind: "found", project });
    vi.mocked(allowed.readOwnerAudio).mockResolvedValue({
      kind: "found",
      audio: {
        bytes: new Uint8Array([1, 2]),
        filename: "site-note.webm",
        mimeType: "audio/webm",
      },
    });
    const response = await appFor(allowed, analyzer).inject({
      method: "POST",
      url,
      headers: { authorization: "Bearer token" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(analyzer.analyze).toHaveBeenCalledWith({
      bytes: new Uint8Array([1, 2]),
      filename: "site-note.webm",
      mimeType: "audio/webm",
      project,
    });
  });

  it("rejects unavailable, missing, and unsupported audio before calling the provider", async () => {
    const project = {
      id: projectId,
      organizationId,
      name: "Kitchen renovation",
      clientName: "Client",
      city: "Brussels",
      address: null,
      status: "active",
      revision: 1,
    };
    const url = `/api/v1/organizations/${organizationId}/projects/${projectId}/files/44444444-4444-4444-8444-444444444444/ai-analysis`;
    const allowed = gateway({ kind: "found", project });
    const analyzer = { analyze: vi.fn() };
    const unavailable = await appFor(allowed).inject({
      method: "POST",
      url,
      headers: { authorization: "Bearer token" },
    });
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.json()).toEqual({ error: "ai_unavailable" });
    expect(allowed.readOwnerAudio).not.toHaveBeenCalled();

    const missing = await appFor(allowed, analyzer).inject({
      method: "POST",
      url,
      headers: { authorization: "Bearer token" },
    });
    expect(missing.statusCode).toBe(404);
    vi.mocked(allowed.readOwnerAudio).mockResolvedValue({
      kind: "unsupported",
    });
    const unsupported = await appFor(allowed, analyzer).inject({
      method: "POST",
      url,
      headers: { authorization: "Bearer token" },
    });
    expect(unsupported.statusCode).toBe(415);
    expect(analyzer.analyze).not.toHaveBeenCalled();
  });
});
