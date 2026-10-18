import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { workspaceKeys } from "@/features/organizations/workspace-context";
import { requireSupabase } from "@/lib/supabase/client";
import type { StorageUsageData } from "./storage-model";
import { StorageUsageView } from "./storage-usage-view";

export async function readStorageUsage(
  organizationId: string,
): Promise<StorageUsageData> {
  const { data, error } = await requireSupabase()
    .rpc("read_storage_usage", { p_org: organizationId })
    .single();
  if (error) throw error;
  if (
    !data ||
    [
      data.account_limit_bytes,
      data.account_used_bytes,
      data.account_reserved_bytes,
      data.workspace_limit_bytes,
      data.workspace_used_bytes,
      data.workspace_reserved_bytes,
    ].some((value) => !Number.isSafeInteger(value) || value < 0) ||
    data.account_limit_bytes === 0 ||
    data.workspace_limit_bytes === 0
  ) {
    throw new Error("Invalid storage usage response");
  }
  return {
    account: {
      limit: data.account_limit_bytes,
      used: data.account_used_bytes,
      reserved: data.account_reserved_bytes,
    },
    workspace: {
      limit: data.workspace_limit_bytes,
      used: data.workspace_used_bytes,
      reserved: data.workspace_reserved_bytes,
    },
  };
}

function useStorageUsage(organizationId: string) {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  return useQuery({
    queryKey: workspaceKeys.storage(userId, organizationId),
    queryFn: () => readStorageUsage(organizationId),
    enabled: !!organizationId,
    staleTime: 15_000,
  });
}

export function StorageUsage({
  organizationId,
  settings = false,
}: {
  organizationId: string;
  settings?: boolean;
}) {
  const query = useStorageUsage(organizationId);
  const [refreshed, setRefreshed] = useState(false);
  return (
    <StorageUsageView
      usage={query.data ?? null}
      failed={query.isError}
      busy={query.isFetching}
      refreshed={refreshed}
      settings={settings}
      onRefresh={() => {
        setRefreshed(false);
        void query.refetch().then((result) => setRefreshed(!result.isError));
      }}
    />
  );
}
