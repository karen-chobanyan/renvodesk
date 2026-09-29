import type { ApiConfig } from "./config.js";
import type {
  AssignableMember,
  Caller,
  ProjectAudioResult,
  ProjectContextGateway,
  ProjectContextResult,
} from "./project-context.js";
import { createSupabaseRest } from "./supabase-rest.js";

interface AuthUser {
  id?: unknown;
  is_anonymous?: unknown;
}

interface MembershipRow {
  role?: unknown;
}

interface ProjectRow {
  id: string;
  organization_id: string;
  name: string;
  client_name: string;
  city: string;
  address: string | null;
  status: string;
  revision: number;
}

interface FileRow {
  id: string;
  organization_id: string;
  project_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  object_key: string;
  state: string;
}

function isFileRow(value: unknown): value is FileRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.organization_id === "string" &&
    typeof row.project_id === "string" &&
    typeof row.original_name === "string" &&
    typeof row.mime_type === "string" &&
    typeof row.size_bytes === "number" &&
    Number.isInteger(row.size_bytes) &&
    typeof row.object_key === "string" &&
    typeof row.state === "string"
  );
}

function isProjectRow(value: unknown): value is ProjectRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.organization_id === "string" &&
    typeof row.name === "string" &&
    typeof row.client_name === "string" &&
    typeof row.city === "string" &&
    (row.address === null || typeof row.address === "string") &&
    typeof row.status === "string" &&
    typeof row.revision === "number" &&
    Number.isInteger(row.revision)
  );
}

function isMemberRow(
  value: unknown,
): value is { user_id: string; email: string } {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.user_id === "string" && typeof row.email === "string";
}

export function createSupabaseGateway(
  config: Pick<ApiConfig, "supabaseUrl" | "supabasePublishableKey">,
  fetcher: typeof fetch = fetch,
): ProjectContextGateway {
  const { request, readRows } = createSupabaseRest(config, fetcher);

  return {
    async authenticate(accessToken): Promise<Caller | null> {
      const response = await request("/auth/v1/user", accessToken);
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw new Error("Supabase Auth request failed");
      const user: unknown = await response.json();
      if (!user || typeof user !== "object") return null;
      const authUser = user as AuthUser;
      if (typeof authUser.id !== "string" || authUser.is_anonymous === true)
        return null;
      return { userId: authUser.id, accessToken };
    },

    async readOwnerProject(
      caller,
      organizationId,
      projectId,
    ): Promise<ProjectContextResult> {
      const membershipQuery = new URLSearchParams({
        select: "role",
        organization_id: `eq.${organizationId}`,
        user_id: `eq.${caller.userId}`,
        limit: "1",
      });
      const memberships = await readRows(
        `/rest/v1/organization_memberships?${membershipQuery}`,
        caller.accessToken,
      );
      const membership = memberships[0] as MembershipRow | undefined;
      if (membership?.role !== "owner") return { kind: "forbidden" };

      const projectQuery = new URLSearchParams({
        select:
          "id,organization_id,name,client_name,city,address,status,revision",
        organization_id: `eq.${organizationId}`,
        id: `eq.${projectId}`,
        limit: "1",
      });
      const projects = await readRows(
        `/rest/v1/projects?${projectQuery}`,
        caller.accessToken,
      );
      const project = projects[0];
      if (!project) return { kind: "not_found" };
      if (
        !isProjectRow(project) ||
        project.organization_id !== organizationId ||
        project.id !== projectId
      ) {
        throw new Error("Unexpected Supabase project response");
      }

      return {
        kind: "found",
        project: {
          id: project.id,
          organizationId: project.organization_id,
          name: project.name,
          clientName: project.client_name,
          city: project.city,
          address: project.address,
          status: project.status,
          revision: project.revision,
        },
      };
    },

    async readOwnerAudio(
      caller,
      organizationId,
      projectId,
      fileId,
    ): Promise<ProjectAudioResult> {
      const fileQuery = new URLSearchParams({
        select:
          "id,organization_id,project_id,original_name,mime_type,size_bytes,object_key,state",
        organization_id: `eq.${organizationId}`,
        project_id: `eq.${projectId}`,
        id: `eq.${fileId}`,
        limit: "1",
      });
      const files = await readRows(
        `/rest/v1/project_files?${fileQuery}`,
        caller.accessToken,
      );
      const file = files[0];
      if (!file) return { kind: "not_found" };
      if (
        !isFileRow(file) ||
        file.organization_id !== organizationId ||
        file.project_id !== projectId ||
        file.id !== fileId ||
        file.object_key !== `${organizationId}/${projectId}/${fileId}`
      )
        throw new Error("Unexpected Supabase file response");
      if (file.state !== "ready") return { kind: "not_found" };
      if (
        !["audio/webm", "audio/mp4"].includes(file.mime_type) ||
        file.size_bytes < 1 ||
        file.size_bytes > 10 * 1024 * 1024
      )
        return { kind: "unsupported" };
      const path = `/storage/v1/object/authenticated/project-files/${organizationId}/${projectId}/${fileId}`;
      const response = await request(path, caller.accessToken);
      if (response.status === 404) return { kind: "not_found" };
      if (!response.ok) throw new Error("Supabase Storage download failed");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length !== file.size_bytes)
        throw new Error("Unexpected Supabase Storage object size");
      return {
        kind: "found",
        audio: {
          bytes,
          filename:
            file.mime_type === "audio/mp4" ? "site-note.m4a" : "site-note.webm",
          mimeType: file.mime_type as "audio/webm" | "audio/mp4",
        },
      };
    },

    // First page of the company team (the RPC returns at most 50 rows). The
    // RPC enforces membership itself; the caller token keeps RLS in force.
    async readAssignableMembers(
      caller,
      organizationId,
    ): Promise<AssignableMember[]> {
      const rows = await readRows(
        "/rest/v1/rpc/team_members",
        caller.accessToken,
        { p_org: organizationId, p_offset: 0 },
      );
      if (!rows.every(isMemberRow))
        throw new Error("Unexpected Supabase team response");
      return rows.map((row) => ({ userId: row.user_id, email: row.email }));
    },
  };
}
