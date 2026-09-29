export interface Caller {
  userId: string;
  accessToken: string;
}

export interface ProjectContext {
  id: string;
  organizationId: string;
  name: string;
  clientName: string;
  city: string;
  address: string | null;
  status: string;
  revision: number;
}

export type ProjectContextResult =
  | { kind: "found"; project: ProjectContext }
  | { kind: "forbidden" }
  | { kind: "not_found" };

export type ProjectAudioResult =
  | {
      kind: "found";
      audio: {
        bytes: Uint8Array;
        filename: string;
        mimeType: "audio/webm" | "audio/mp4";
      };
    }
  | { kind: "not_found" }
  | { kind: "unsupported" };

export interface AssignableMember {
  userId: string;
  email: string;
}

export interface ProjectContextGateway {
  authenticate(accessToken: string): Promise<Caller | null>;
  readOwnerProject(
    caller: Caller,
    organizationId: string,
    projectId: string,
  ): Promise<ProjectContextResult>;
  readOwnerAudio(
    caller: Caller,
    organizationId: string,
    projectId: string,
    fileId: string,
  ): Promise<ProjectAudioResult>;
  readAssignableMembers(
    caller: Caller,
    organizationId: string,
  ): Promise<AssignableMember[]>;
}
