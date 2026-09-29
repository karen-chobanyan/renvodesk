import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalysisStore } from "./analysis-store.js";
import { buildApp } from "./app.js";
import type {
  ProjectContextGateway,
  ProjectContextResult,
} from "./project-context.js";

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
    readAssignableMembers: vi.fn(async () => []),
  };
}

const store = {} as AnalysisStore;
const apps: ReturnType<typeof buildApp>[] = [];
function appFor(gw: ProjectContextGateway) {
  const app = buildApp(gw, store);
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
    expect(response.json()).toEqual({
      error: "service_unavailable",
      reason: "internal_error",
    });
  });
});
