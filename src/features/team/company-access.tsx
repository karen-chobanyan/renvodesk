import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useParams } from "react-router";
import { useAuth } from "@/features/auth/auth-provider";
import { workspaceKeys } from "@/features/organizations/workspace-context";
import { useLocale } from "@/lib/i18n";
import { requireSupabase } from "@/lib/supabase/client";
import { teamCopy } from "./team-copy";
export function useCompanyAccess(org?: string) {
  const { session } = useAuth();
  const user = session?.user.id ?? "";
  const query = useQuery({
    queryKey: workspaceKeys.access(user, org ?? ""),
    enabled: !!org && !!user,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from("organization_memberships")
        .select("role")
        .eq("organization_id", org ?? "")
        .eq("user_id", user)
        .maybeSingle();
      if (error) throw error;
      return data?.role ?? null;
    },
  });
  const role = org && user && !query.isError ? (query.data ?? null) : null;
  return {
    role,
    owner: role === "owner",
    loading: !!org && !!user && query.isPending && query.isFetching,
    user,
  };
}
export function OwnerRoute() {
  const { organizationId } = useParams();
  const access = useCompanyAccess(organizationId);
  const { locale } = useLocale(),
    c = teamCopy[locale];
  if (access.loading)
    return (
      <p className="auth-loading" role="status">
        {c.loading}
      </p>
    );
  return access.owner ? (
    <Outlet />
  ) : (
    <main className="auth-main">
      <h1>{c.ownerOnly}</h1>
      <Link
        className="account-link"
        to={`/workspace?company=${organizationId}`}
      >
        {c.back}
      </Link>
    </main>
  );
}
