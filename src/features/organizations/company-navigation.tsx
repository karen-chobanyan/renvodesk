import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { authErrorKey, useAuthCopy } from "@/features/auth/copy";
import { useCompanyAccess } from "@/features/team/company-access";
import { useLocale } from "@/lib/i18n";
import { requireSupabase } from "@/lib/supabase/client";
import { getOrganizations, type Organization } from "./organization-service";
export function CompanyNavigation({
  id,
  close,
}: {
  id?: string;
  close: () => void;
}) {
  const { session } = useAuth(),
    t = useAuthCopy(),
    { locale } = useLocale(),
    navigate = useNavigate();
  const { owner } = useCompanyAccess(id);
  const menu = useRef<HTMLDetailsElement>(null);
  function dismiss() {
    if (menu.current) menu.current.open = false;
    close();
  }
  const [rows, setRows] = useState<Organization[]>([]),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload retries membership reads
  useEffect(() => {
    let active = true;
    setRows([]);
    setFailed(false);
    if (session)
      void getOrganizations(session.user.id)
        .then((data) => {
          if (active) setRows(data);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
    };
  }, [session?.user.id, id, reload]);
  const active = rows.find((row) => row.id === id);
  const name = active?.name ?? t("companies");
  return (
    <details
      className="company-menu"
      ref={menu}
      onKeyDown={(e) => {
        if (e.key === "Escape" && e.currentTarget.open) {
          e.stopPropagation();
          e.currentTarget.open = false;
          e.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="workspace-switch compact-identity">
        <span className="company-avatar">
          {active?.name.slice(0, 2).toUpperCase() ?? "R."}
        </span>
        <span className="identity-copy">
          <strong>{name}</strong>
          <small>{t("realData")}</small>
        </span>
        <ChevronDown size={14} />
      </summary>
      <div className="company-navigation">
        <label htmlFor="company-switcher">
          {locale === "fr" ? "Entreprise" : "Company"}
        </label>
        <select
          id="company-switcher"
          className="input"
          value={rows.some((r) => r.id === id) ? id : ""}
          onChange={(e) => {
            navigate(`/workspace?company=${e.target.value}`);
            dismiss();
          }}
        >
          <option value="" disabled>
            {t("companies")}
          </option>
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        {failed && (
          <div role="alert">
            <p>{t("loadError")}</p>
            <Button variant="ghost" onClick={() => setReload((n) => n + 1)}>
              {t("retry")}
            </Button>
          </div>
        )}
        <Link
          to={id ? `/workspace?company=${id}&new=1` : "/workspace?new=1"}
          onClick={dismiss}
        >
          {t("addCompany")}
        </Link>
        {id && owner && (
          <>
            <Link to={`/workspace/${id}/team`} onClick={dismiss}>
              {locale === "fr" ? "Équipe" : "Team"}
            </Link>
            <Link to={`/workspace/${id}/settings`} onClick={dismiss}>
              {locale === "fr"
                ? "Paramètres de l’entreprise"
                : "Company settings"}
            </Link>
          </>
        )}
      </div>
    </details>
  );
}
export function AccountControls() {
  const { session } = useAuth(),
    t = useAuthCopy();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const result = await requireSupabase().auth.signOut({ scope: "local" });
      if (result.error) throw result.error;
    } catch (e) {
      setError(t(authErrorKey(e)));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="account-menu"
      onKeyDown={(e) => {
        if (e.key === "Escape" && e.currentTarget.open) {
          e.stopPropagation();
          e.currentTarget.open = false;
          e.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="profile compact-identity">
        <span className="profile-avatar">
          {session?.user.email?.slice(0, 2).toUpperCase() ?? "R."}
        </span>
        <span className="identity-copy">
          <strong>{session?.user.email}</strong>
          <small>{t("account")}</small>
        </span>
        <ChevronDown size={14} />
      </summary>
      <div className="sidebar-account">
        <Button variant="ghost" disabled={busy} onClick={logout}>
          {t("logout")}
        </Button>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
