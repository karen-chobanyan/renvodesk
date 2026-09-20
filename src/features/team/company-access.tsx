import { useEffect, useState } from "react";
import { Link, Outlet, useParams } from "react-router";
import { useAuth } from "@/features/auth/auth-provider";
import { useLocale } from "@/lib/i18n";
import { requireSupabase } from "@/lib/supabase/client";
import { teamCopy } from "./team-copy";
export function useCompanyAccess(org?: string) {
  const { session } = useAuth();
  const user = session?.user.id;
  const [state, setState] = useState<{
    key: string;
    role: string | null;
    loading: boolean;
  }>({ key: "", role: null, loading: true });
  const key = `${user}:${org}`;
  useEffect(() => {
    let active = true;
    setState({ key, role: null, loading: !!org && !!user });
    if (org && user)
      void requireSupabase()
        .from("organization_memberships")
        .select("role")
        .eq("organization_id", org)
        .eq("user_id", user)
        .maybeSingle()
        .then(
          ({ data, error }) => {
            if (active)
              setState({
                key,
                role: error ? null : (data?.role ?? null),
                loading: false,
              });
          },
          () => {
            if (active) setState({ key, role: null, loading: false });
          },
        );
    return () => {
      active = false;
    };
  }, [org, user, key]);
  const role = state.key === key ? state.role : null;
  return {
    role,
    owner: role === "owner",
    loading: state.key !== key || state.loading,
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
