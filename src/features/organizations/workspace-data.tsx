import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useParams, useSearchParams } from "react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/features/auth/auth-provider";
import { useLocale } from "@/lib/i18n";
import { getOrganizations } from "./organization-service";
import {
  WorkspaceContext,
  type WorkspaceData,
  workspaceKeys,
} from "./workspace-context";

export function WorkspaceDataRoute() {
  const { session } = useAuth();
  return session ? <WorkspaceLayout key={session.user.id} /> : null;
}

export function SessionQueryProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  return (
    <SessionQueryClient key={session?.user.id ?? "signed-out"}>
      {children}
    </SessionQueryClient>
  );
}

function SessionQueryClient({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, gcTime: 10 * 60_000, retry: 1 },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function WorkspaceLayout() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const params = useParams();
  const [search] = useSearchParams();
  const { applyWorkspaceLanguage } = useLocale();
  const viewState = useRef(new Map<string, unknown>());
  const query = useQuery({
    queryKey: workspaceKeys.organizations(userId),
    queryFn: () => getOrganizations(userId),
    enabled: !!userId,
  });
  const organizations = query.data ?? [];
  const organizationId =
    params.organizationId ??
    search.get("company") ??
    organizations[0]?.id ??
    "";
  const organization = organizations.find((row) => row.id === organizationId);
  useLayoutEffect(() => {
    if (organization)
      applyWorkspaceLanguage(
        organization.id,
        organization.default_language === "en" ? "en" : "fr",
      );
  }, [organization, applyWorkspaceLanguage]);
  const value: WorkspaceData = {
    organizations,
    organization,
    organizationId,
    loading: query.isPending && query.isFetching,
    failed: query.isError && !query.data,
    refresh: () => query.refetch(),
    viewState: viewState.current,
  };
  return (
    <WorkspaceContext.Provider value={value}>
      <AppShell
        live
        company={organization?.name}
        companyLoading={query.isPending && query.isFetching}
        organizationId={organizationId}
      >
        <Outlet />
      </AppShell>
    </WorkspaceContext.Provider>
  );
}
