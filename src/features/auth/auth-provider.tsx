import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Navigate, Outlet } from "react-router";
import { supabase } from "@/lib/supabase/client";
import { useAuthCopy } from "./copy";

type AuthState = { session: Session | null; loading: boolean; failed: boolean };
const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  failed: false,
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    loading: true,
    failed: false,
  });
  useEffect(() => {
    if (!supabase) {
      setState({ session: null, loading: false, failed: false });
      return;
    }
    let active = true;
    let received = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      received = true;
      if (active) setState({ session, loading: false, failed: false });
    });
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && !received)
          setState({ session: data.session, loading: false, failed: !!error });
      })
      .catch(() => {
        if (active) setState({ session: null, loading: false, failed: true });
      });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
export function RequireAuth() {
  const { session, loading, failed } = useAuth();
  const t = useAuthCopy();
  if (loading)
    return (
      <p className="auth-loading" role="status">
        {t("loading")}
      </p>
    );
  if (failed)
    return (
      <div className="auth-loading" role="alert">
        {t("network")} <a href="/login">{t("retry")}</a>
      </div>
    );
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}
