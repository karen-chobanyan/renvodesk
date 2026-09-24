import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-provider";
import { getOrganization } from "./organization-service";
import { workspaceKeys } from "./workspace-context";

export function useOrganizationRecord(organizationId: string) {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  return useQuery({
    queryKey: workspaceKeys.organization(userId, organizationId),
    queryFn: () => getOrganization(organizationId),
    enabled: !!organizationId,
  });
}
