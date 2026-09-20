import { ArrowUpRight, Building2, Check, LogOut, Plus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/features/auth/auth-page";
import { useAuth } from "@/features/auth/auth-provider";
import { authErrorKey, useAuthCopy } from "@/features/auth/copy";
import { requireSupabase } from "@/lib/supabase/client";
import {
  createOrganization,
  getOrganizations,
  type Organization,
} from "./organization-service";
export function WorkspacePage() {
  const { session } = useAuth();
  return session ? (
    <Workspace
      key={session.user.id}
      userId={session.user.id}
      email={session.user.email ?? ""}
    />
  ) : null;
}
function Workspace({ userId, email }: { userId: string; email: string }) {
  const t = useAuthCopy();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [selected, setSelected] = useState("");
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload intentionally invalidates the company query after creation or retry
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    void getOrganizations(userId)
      .then((data) => {
        if (active) {
          setOrganizations(data);
          setSelected((current) =>
            data.some((o) => o.id === current) ? current : (data[0]?.id ?? ""),
          );
        }
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, reload]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim(),
      country = String(data.get("country") ?? "");
    if (!name || name.length > 120 || !["BE", "FR", "NL"].includes(country)) {
      setError(t("companyInvalid"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const id = await createOrganization(name, country, requestId);
      setRequestId(crypto.randomUUID());
      setCreating(false);
      setSelected(id);
      setReload((n) => n + 1);
    } catch (error) {
      setError(t(authErrorKey(error)));
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const { error } = await requireSupabase().auth.signOut({
        scope: "local",
      });
      if (error) throw error;
    } catch (error) {
      setError(t(authErrorKey(error)));
    } finally {
      setBusy(false);
    }
  }
  const showForm = creating || organizations.length === 0;
  const activeOrganization = organizations.find((o) => o.id === selected);
  return (
    <AuthLayout>
      <section className="connected-workspace">
        <div className="connected-toolbar">
          <span className="status status-active">
            <span />
            {t("realData")}
          </span>
          <Button variant="ghost" disabled={busy} onClick={signOut}>
            <LogOut size={15} />
            {t("logout")}
          </Button>
        </div>
        <p className="eyebrow">{email}</p>
        <h1>{t(showForm ? "companyTitle" : "workspace")}</h1>
        <p className="page-description">
          {t(showForm ? "companyHint" : "workspaceHint")}
        </p>
        {loading ? (
          <p role="status" className="workspace-loading">
            {t("loading")}
          </p>
        ) : loadFailed ? (
          <div className="workspace-loading">
            <p role="alert">{t("loadError")}</p>
            <Button variant="outline" onClick={() => setReload((n) => n + 1)}>
              {t("retry")}
            </Button>
          </div>
        ) : showForm ? (
          <form className="company-form" onSubmit={submit}>
            <label className="field" htmlFor="company-name">
              {t("companyName")}
              <Input
                id="company-name"
                name="name"
                autoComplete="organization"
                maxLength={120}
                required
              />
            </label>
            <label className="field" htmlFor="company-country">
              {t("country")}
              <select
                className="input"
                id="company-country"
                name="country"
                defaultValue="BE"
              >
                <option value="BE">{t("belgium")}</option>
                <option value="FR">{t("france")}</option>
                <option value="NL">{t("netherlands")}</option>
              </select>
            </label>
            <div className="dialog-actions">
              {organizations.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreating(false);
                    setError("");
                  }}
                >
                  {t("cancel")}
                </Button>
              )}
              <Button type="submit" disabled={busy}>
                {t(busy ? "working" : "createCompany")}
                <Plus size={15} />
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="section-heading workspace-heading">
              <h2>{t("companies")}</h2>
              <Button
                variant="outline"
                onClick={() => {
                  setCreating(true);
                  setError("");
                }}
              >
                <Plus size={15} />
                {t("addCompany")}
              </Button>
            </div>
            <div className="organization-list">
              {organizations.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => setSelected(o.id)}
                  aria-pressed={o.id === selected}
                >
                  <Building2 size={22} />
                  <span>
                    <strong>{o.name}</strong>
                    <small>
                      {t(
                        o.country === "BE"
                          ? "belgium"
                          : o.country === "FR"
                            ? "france"
                            : "netherlands",
                      )}{" "}
                      · {t("owner")}
                    </small>
                  </span>
                  {o.id === selected ? (
                    <Check size={18} />
                  ) : (
                    <ArrowUpRight size={18} />
                  )}
                </button>
              ))}
            </div>
            {activeOrganization && (
              <p className="helper-text">
                {t("selected")} : {activeOrganization.name}
              </p>
            )}
            <div className="workspace-next">
              <p>{t("demoHint")}</p>
              <Button asChild variant="outline">
                <Link to="/projects">
                  {t("demo")}
                  <ArrowUpRight size={15} />
                </Link>
              </Button>
            </div>
          </>
        )}
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
      </section>
    </AuthLayout>
  );
}
