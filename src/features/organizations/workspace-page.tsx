import { Plus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import { authErrorKey, useAuthCopy } from "@/features/auth/copy";
import { SavedProjects } from "@/features/projects/saved-projects";
import { StorageUsage } from "@/features/storage-usage/storage-usage";
import { useLocale } from "@/lib/i18n";
import { CompanyContacts } from "./company-contacts";
import {
  createOrganization,
  getOrganizations,
  type Organization,
} from "./organization-service";
export function WorkspacePage({ settings = false }: { settings?: boolean }) {
  const { session } = useAuth();
  return session ? (
    <Workspace
      key={session.user.id}
      userId={session.user.id}
      settings={settings}
    />
  ) : null;
}
function Workspace({
  userId,
  settings,
}: {
  userId: string;
  settings: boolean;
}) {
  const [search] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();
  const requested = params.organizationId ?? search.get("company") ?? "";
  const t = useAuthCopy();
  const { t: ui, locale } = useLocale();
  const settingsTitle =
    locale === "fr" ? "Paramètres de l’entreprise" : "Company settings";
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const creating = search.get("new") === "1";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const selected = requested || organizations[0]?.id || "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload intentionally invalidates the company query after creation or retry
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    void getOrganizations(userId)
      .then((data) => {
        if (active) {
          setOrganizations(data);
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
      navigate(`/workspace?company=${id}`);
      setReload((n) => n + 1);
    } catch (error) {
      setError(t(authErrorKey(error)));
    } finally {
      setBusy(false);
    }
  }
  const showForm = creating || organizations.length === 0;
  const activeOrganization = organizations.find((o) => o.id === selected);
  return (
    <AppShell
      live
      company={activeOrganization?.name}
      organizationId={activeOrganization?.id}
    >
      <section className="connected-workspace">
        <p className="eyebrow">{settings ? settingsTitle : ui("projects")}</p>
        <h1>
          {showForm
            ? t("companyTitle")
            : settings
              ? settingsTitle
              : ui("title")}
        </h1>
        <p className="page-description">
          {showForm
            ? t("companyHint")
            : settings
              ? activeOrganization?.name
              : ui("subtitle")}
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
                    navigate(`/workspace?company=${selected}`);
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
        ) : activeOrganization ? (
          settings ? (
            <>
              <StorageUsage organizationId={activeOrganization.id} />
              <CompanyContacts
                key={activeOrganization.id}
                id={activeOrganization.id}
              />
            </>
          ) : (
            <SavedProjects
              key={activeOrganization.id}
              organizationId={activeOrganization.id}
            />
          )
        ) : (
          <p role="alert">{t("loadError")}</p>
        )}
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
      </section>
    </AppShell>
  );
}
