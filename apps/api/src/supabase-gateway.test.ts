import { describe, expect, it, vi } from "vitest";
import { createSupabaseGateway } from "./supabase-gateway.js";

const organizationId = "11111111-1111-4111-8111-111111111111";
const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
const projectId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const config = {
  supabaseUrl: "https://example.supabase.co",
  supabasePublishableKey: "sb_publishable_test",
  port: 3001,
  openaiApiOrigin: "https://api.openai.com" as const,
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockSupabase(role: "owner" | "member" | null) {
  const requests: {
    url: URL;
    authorization: string | null;
    apikey: string | null;
  }[] = [];
  const fetcher: typeof fetch = vi.fn(async (input, init) => {
    const url = new URL(input.toString());
    const headers = new Headers(init?.headers);
    requests.push({
      url,
      authorization: headers.get("authorization"),
      apikey: headers.get("apikey"),
    });

    if (url.pathname === "/auth/v1/user") {
      return json({ id: userId, is_anonymous: false });
    }
    if (url.pathname === "/rest/v1/organization_memberships") {
      if (url.searchParams.get("organization_id") !== `eq.${organizationId}`) {
        return json([]);
      }
      return json(role ? [{ role }] : []);
    }
    if (url.pathname === "/rest/v1/projects") {
      return json([
        {
          id: projectId,
          organization_id: organizationId,
          name: "Kitchen renovation",
          client_name: "Example client",
          city: "Brussels",
          address: null,
          status: "planning",
          revision: 2,
        },
      ]);
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
  return { fetcher, requests };
}

describe("Supabase project context gateway", () => {
  it("verifies the bearer token and reads only the owner's scoped project", async () => {
    const { fetcher, requests } = mockSupabase("owner");
    const gateway = createSupabaseGateway(config, fetcher);
    const caller = await gateway.authenticate("user-access-token");
    expect(caller).toEqual({ userId, accessToken: "user-access-token" });
    if (!caller) throw new Error("Expected authenticated caller");

    const result = await gateway.readOwnerProject(
      caller,
      organizationId,
      projectId,
    );
    expect(result).toEqual({
      kind: "found",
      project: {
        id: projectId,
        organizationId,
        name: "Kitchen renovation",
        clientName: "Example client",
        city: "Brussels",
        address: null,
        status: "planning",
        revision: 2,
      },
    });
    expect(requests.map((request) => request.url.pathname)).toEqual([
      "/auth/v1/user",
      "/rest/v1/organization_memberships",
      "/rest/v1/projects",
    ]);
    expect(
      requests.every(
        (request) => request.authorization === "Bearer user-access-token",
      ),
    ).toBe(true);
    expect(
      requests.every((request) => request.apikey === "sb_publishable_test"),
    ).toBe(true);
    expect(requests[1].url.searchParams.get("user_id")).toBe(`eq.${userId}`);
    expect(requests[1].url.searchParams.get("organization_id")).toBe(
      `eq.${organizationId}`,
    );
    expect(requests[2].url.searchParams.get("organization_id")).toBe(
      `eq.${organizationId}`,
    );
    expect(requests[2].url.searchParams.get("id")).toBe(`eq.${projectId}`);
  });

  it("stops before project data for members and other organizations", async () => {
    for (const [role, requestedOrganization] of [
      ["member", organizationId],
      [null, organizationId],
      ["owner", otherOrganizationId],
    ] as const) {
      const { fetcher, requests } = mockSupabase(role);
      const gateway = createSupabaseGateway(config, fetcher);
      const caller = await gateway.authenticate("user-access-token");
      if (!caller) throw new Error("Expected authenticated caller");
      expect(
        await gateway.readOwnerProject(
          caller,
          requestedOrganization,
          projectId,
        ),
      ).toEqual({ kind: "forbidden" });
      expect(
        requests.some(
          (request) => request.url.pathname === "/rest/v1/projects",
        ),
      ).toBe(false);
    }
  });

  it("rejects an anonymous Auth user", async () => {
    const fetcher: typeof fetch = vi.fn(async () =>
      json({ id: userId, is_anonymous: true }),
    );
    expect(
      await createSupabaseGateway(config, fetcher).authenticate("token"),
    ).toBeNull();
  });

  it("reads only a matching ready audio object with the caller token", async () => {
    const fileId = "44444444-4444-4444-8444-444444444444";
    const requested: { url: URL; authorization: string | null }[] = [];
    const fetcher: typeof fetch = vi.fn(async (input, init) => {
      const url = new URL(input.toString());
      requested.push({
        url,
        authorization: new Headers(init?.headers).get("authorization"),
      });
      if (url.pathname === "/rest/v1/project_files")
        return json([
          {
            id: fileId,
            organization_id: organizationId,
            project_id: projectId,
            original_name: "note.webm",
            mime_type: "audio/webm",
            size_bytes: 2,
            object_key: `${organizationId}/${projectId}/${fileId}`,
            state: "ready",
          },
        ]);
      if (url.pathname.startsWith("/storage/v1/object/authenticated/"))
        return new Response(new Uint8Array([1, 2]));
      throw new Error("Unexpected request");
    });
    const result = await createSupabaseGateway(config, fetcher).readOwnerAudio(
      { userId, accessToken: "user-access-token" },
      organizationId,
      projectId,
      fileId,
    );
    expect(result).toEqual({
      kind: "found",
      audio: {
        bytes: new Uint8Array([1, 2]),
        filename: "site-note.webm",
        mimeType: "audio/webm",
      },
    });
    expect(requested[0].url.searchParams.get("organization_id")).toBe(
      `eq.${organizationId}`,
    );
    expect(requested[0].url.searchParams.get("project_id")).toBe(
      `eq.${projectId}`,
    );
    expect(requested[0].url.searchParams.get("id")).toBe(`eq.${fileId}`);
    expect(requested.map((item) => item.authorization)).toEqual([
      "Bearer user-access-token",
      "Bearer user-access-token",
    ]);
  });

  it("does not download a cross-project or unsupported file", async () => {
    const fileId = "44444444-4444-4444-8444-444444444444";
    const paths: string[] = [];
    let fileProjectId = "99999999-9999-4999-8999-999999999999";
    let mimeType = "audio/webm";
    const fetcher: typeof fetch = vi.fn(async (input) => {
      const path = new URL(input.toString()).pathname;
      paths.push(path);
      if (path !== "/rest/v1/project_files")
        throw new Error("Storage should not be downloaded");
      return json([
        {
          id: fileId,
          organization_id: organizationId,
          project_id: fileProjectId,
          original_name: "note.webm",
          mime_type: mimeType,
          size_bytes: 2,
          object_key: `${organizationId}/${fileProjectId}/${fileId}`,
          state: "ready",
        },
      ]);
    });
    const gateway = createSupabaseGateway(config, fetcher);
    const caller = { userId, accessToken: "user-access-token" };
    await expect(
      gateway.readOwnerAudio(caller, organizationId, projectId, fileId),
    ).rejects.toThrow("Unexpected Supabase file response");
    fileProjectId = projectId;
    mimeType = "audio/ogg";
    expect(
      await gateway.readOwnerAudio(caller, organizationId, projectId, fileId),
    ).toEqual({ kind: "unsupported" });
    expect(paths).toEqual(["/rest/v1/project_files", "/rest/v1/project_files"]);
  });

  it("reads assignable team members through the RPC with the caller token", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    let rows: unknown = [
      {
        user_id: "55555555-5555-4555-8555-555555555555",
        email: "marc@example.test",
        role: "member",
      },
    ];
    const fetcher: typeof fetch = vi.fn(async (input, init) => {
      calls.push({ url: input.toString(), init });
      return json(rows);
    });
    const gateway = createSupabaseGateway(config, fetcher);
    const caller = { userId, accessToken: "user-access-token" };
    expect(await gateway.readAssignableMembers(caller, organizationId)).toEqual(
      [
        {
          userId: "55555555-5555-4555-8555-555555555555",
          email: "marc@example.test",
        },
      ],
    );
    expect(new URL(calls[0].url).pathname).toBe("/rest/v1/rpc/team_members");
    expect(calls[0].init?.method).toBe("POST");
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({
      p_org: organizationId,
      p_offset: 0,
    });
    const headers = new Headers(calls[0].init?.headers);
    expect(headers.get("authorization")).toBe("Bearer user-access-token");
    expect(headers.get("content-type")).toBe("application/json");
    rows = [{ user_id: 1, email: null }];
    await expect(
      gateway.readAssignableMembers(caller, organizationId),
    ).rejects.toThrow("Unexpected Supabase team response");
  });
});
