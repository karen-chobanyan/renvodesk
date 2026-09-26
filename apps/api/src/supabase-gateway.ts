import type { ApiConfig } from "./config.js";
import type {
  Caller,
  ProjectAudioResult,
  ProjectContextGateway,
  ProjectContextResult,
} from "./project-context.js";

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

export function createSupabaseGateway(
  config: ApiConfig,
  fetcher: typeof fetch = fetch,
): ProjectContextGateway {
  async function request(path: string, accessToken: string) {
    return fetcher(new URL(path, config.supabaseUrl), {
      headers: {
        apikey: config.supabasePublishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
  }

  async function readRows(
    path: string,
    accessToken: string,
  ): Promise<unknown[]> {
    const response = await request(path, accessToken);
    if (!response.ok) throw new Error("Supabase Data API request failed");
    const body: unknown = await response.json();
    if (!Array.isArray(body))
      throw new Error("Unexpected Supabase Data API response");
    return body;
  }

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
  };
}
