import { ArrowRight, ArrowUpRight } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { requireSupabase, supabase } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";
import { authReturn } from "./auth-return";
import { type AuthKey, authErrorKey, useAuthCopy } from "./copy";
export function AuthLayout({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useLocale();
  const t = useAuthCopy();
  return (
    <div className="auth-layout">
      <header>
        <Link className="brand" to="/login">
          <span className="brand-mark">
            r<span>.</span>
          </span>
          RenvoDesk
        </Link>
        <label className="language-picker">
          <span className="sr-only">{t("language")}</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value === "en" ? "en" : "fr")}
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
        </label>
      </header>
      <main className="auth-main">{children}</main>
      <footer>
        <Link to="/projects">
          {t("demo")}
          <ArrowUpRight size={14} />
        </Link>
        <span>RenvoDesk</span>
      </footer>
    </div>
  );
}
type Mode = "login" | "signup" | "request" | "update";
export function AuthPage({ mode }: { mode: Mode }) {
  const t = useAuthCopy();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = authReturn(location.search);
  const nextQuery =
    destination === "/workspace"
      ? ""
      : `?next=${encodeURIComponent(destination)}`;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthKey | null>(null);
  const [message, setMessage] = useState<AuthKey | null>(null);
  const title = {
    login: "login",
    signup: "signupTitle",
    request: "resetTitle",
    update: "updateTitle",
  } as const;
  const hint = {
    login: "loginHint",
    signup: "signupHint",
    request: "resetHint",
    update: "updateHint",
  } as const;
  const action = {
    login: "loginAction",
    signup: "signupAction",
    request: "resetAction",
    update: "updateAction",
  } as const;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      const client = requireSupabase();
      if (mode === "login") {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate(destination, { replace: true });
      } else if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback${nextQuery}`,
          },
        });
        if (error) throw error;
        if (data.session) navigate(destination, { replace: true });
        else setMessage("confirmation");
      } else if (mode === "request") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        });
        if (error) throw error;
        setMessage("resetSent");
      } else {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        navigate(destination, { replace: true });
      }
    } catch (error) {
      setError(authErrorKey(error));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <AuthLayout>
        <p role="status">{t("verify")}</p>
      </AuthLayout>
    );
  if (session && (mode === "login" || mode === "signup"))
    return <Navigate to={destination} replace />;
  const invalidRecovery =
    mode === "update" &&
    (!session || new URLSearchParams(location.search).has("error"));
  return (
    <AuthLayout>
      <section className="auth-panel">
        <p className="eyebrow">RenvoDesk</p>
        <h1>{t(title[mode])}</h1>
        <p className="page-description">{t(hint[mode])}</p>
        {!supabase ? (
          <p role="alert" className="error-message">
            {t("config")}
          </p>
        ) : invalidRecovery ? (
          <>
            <p role="alert" className="error-message">
              {t("expired")}
            </p>
            <Link className="auth-text-link" to="/auth/forgot">
              {t("forgot")}
            </Link>
          </>
        ) : (
          <form onSubmit={submit}>
            {mode !== "update" && (
              <label className="field" htmlFor="auth-email">
                {t("email")}
                <Input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
            )}
            {mode !== "request" && (
              <>
                <label className="field" htmlFor="auth-password">
                  {t("password")}
                  <Input
                    id="auth-password"
                    aria-describedby={
                      mode === "login" ? undefined : "password-hint"
                    }
                    name="password"
                    type="password"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                    minLength={mode === "login" ? 1 : 12}
                    maxLength={128}
                  />
                </label>
                {mode !== "login" && (
                  <small id="password-hint" className="muted">
                    {t("passwordHint")}
                  </small>
                )}
              </>
            )}
            {error && (
              <p className="error-message" role="alert">
                {t(error)}
              </p>
            )}
            {message && (
              <p className="auth-success" role="status">
                {t(message)}
              </p>
            )}
            <Button className="auth-submit" type="submit" disabled={busy}>
              {t(busy ? "working" : action[mode])}
              <ArrowRight size={16} />
            </Button>
          </form>
        )}
        {mode === "login" ? (
          <>
            <Link className="auth-text-link" to="/auth/forgot">
              {t("forgot")}
            </Link>
            <div className="auth-bottom">
              {t("signinFooter")}{" "}
              <Link to={`/signup${nextQuery}`}>{t("signup")}</Link>
            </div>
          </>
        ) : (
          <div className="auth-bottom">
            <Link to={`/login${nextQuery}`}>{t("backLogin")}</Link>
          </div>
        )}
      </section>
    </AuthLayout>
  );
}
export function AuthCallback() {
  const { session, loading } = useAuth();
  const t = useAuthCopy();
  const location = useLocation();
  const destination = authReturn(location.search);
  const nextQuery =
    destination === "/workspace"
      ? ""
      : `?next=${encodeURIComponent(destination)}`;
  const failed = new URLSearchParams(location.search).has("error");
  if (!loading && session && !failed)
    return <Navigate to={destination} replace />;
  return (
    <AuthLayout>
      <section className="auth-panel">
        <h1>{t(loading ? "verify" : "callbackError")}</h1>
        {!loading && (
          <Link className="auth-text-link" to={`/login${nextQuery}`}>
            {t("backLogin")}
          </Link>
        )}
      </section>
    </AuthLayout>
  );
}
