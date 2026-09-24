import { createContext, useContext, useState } from "react";
import type { Organization } from "./organization-service";

export type WorkspaceData = {
  organizations: Organization[];
  organization: Organization | undefined;
  organizationId: string;
  loading: boolean;
  failed: boolean;
  refresh: () => Promise<unknown>;
  viewState: Map<string, unknown>;
};

export const WorkspaceContext = createContext<WorkspaceData | null>(null);

export const workspaceKeys = {
  organizations: (userId: string) =>
    ["workspace", userId, "organizations"] as const,
  access: (userId: string, organizationId: string) =>
    ["workspace", userId, organizationId, "access"] as const,
  organization: (userId: string, organizationId: string) =>
    ["workspace", userId, organizationId, "organization"] as const,
  projects: (userId: string, organizationId: string) =>
    ["workspace", userId, organizationId, "projects"] as const,
  clients: (
    userId: string,
    organizationId: string,
    kind: string,
    search: string,
  ) => ["workspace", userId, organizationId, "clients", kind, search] as const,
  team: (userId: string, organizationId: string) =>
    ["workspace", userId, organizationId, "team"] as const,
  project: (userId: string, organizationId: string, projectId: string) =>
    ["workspace", userId, organizationId, "project", projectId] as const,
  estimates: (userId: string, organizationId: string, search: string) =>
    ["workspace", userId, organizationId, "estimates", search] as const,
  estimate: (userId: string, organizationId: string, estimateId: string) =>
    ["workspace", userId, organizationId, "estimate", estimateId] as const,
  storage: (userId: string, organizationId: string) =>
    ["workspace", userId, organizationId, "storage"] as const,
};

export function useWorkspace(): WorkspaceData {
  const value = useContext(WorkspaceContext);
  if (!value)
    throw new Error("Workspace data is unavailable outside its route");
  return value;
}

export function useWorkspaceRouteState<T>(
  key: string,
  initial: T,
): [T, (value: T) => void] {
  const { viewState } = useWorkspace();
  const [entry, setEntry] = useState(() => ({
    key,
    value: viewState.has(key) ? (viewState.get(key) as T) : initial,
  }));
  const value =
    entry.key === key
      ? entry.value
      : viewState.has(key)
        ? (viewState.get(key) as T)
        : initial;
  function update(next: T) {
    viewState.set(key, next);
    setEntry({ key, value: next });
  }
  return [value, update];
}
