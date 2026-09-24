import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authErrorKey, useAuthCopy } from "@/features/auth/copy";
import { SavedProjects } from "@/features/projects/saved-projects";
import { StorageUsage } from "@/features/storage-usage/storage-usage";
import { useLocale } from "@/lib/i18n";
import { CompanyContacts } from "./company-contacts";
import { createOrganization } from "./organization-service";
import { useWorkspace } from "./workspace-context";
import { WorkspacePreferences } from "./workspace-preferences";
export function WorkspacePage({ settings = false }: { settings?: boolean }) {
  return <Workspace settings={settings} />;
}
function Workspace({ settings }: { settings: boolean }) {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const t = useAuthCopy();
  const { t: ui, locale } = useLocale();
  const settingsTitle = locale === "fr" ? "Paramètres" : "Settings";
  const {
    organizations,
    organization: activeOrganization,
    organizationId: selected,
    loading,
    failed: loadFailed,
    refresh,
  } = useWorkspace();
  const creating = search.get("new") === "1";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
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
      await refresh();
      navigate(`/workspace?company=${id}`);
    } catch (error) {
      setError(t(authErrorKey(error)));
    } finally {
      setBusy(false);
    }
  }
  const showForm = creating || (!loading && organizations.length === 0);
  return (
    <section className="connected-workspace">
      <p className="eyebrow">{settings ? settingsTitle : ui("projects")}</p>
      <h1>
        {loading ? (
          <span className="workspace-title-placeholder" aria-hidden="true" />
        ) : showForm ? (
          t("companyTitle")
        ) : settings ? (
          settingsTitle
        ) : (
          ui("title")
        )}
      </h1>
      <p className="page-description">
        {loading ? (
          <span
            className="workspace-description-placeholder"
            aria-hidden="true"
          />
        ) : showForm ? (
          t("companyHint")
        ) : settings ? (
          activeOrganization?.name
        ) : (
          ui("subtitle")
        )}
      </p>
      {loading ? (
        <p role="status" className="workspace-loading">
          {t("loading")}
        </p>
      ) : loadFailed ? (
        <div className="workspace-loading">
          <p role="alert">{t("loadError")}</p>
          <Button variant="outline" onClick={() => void refresh()}>
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
          <div className="workspace-settings">
            <WorkspacePreferences
              key={activeOrganization.id}
              id={activeOrganization.id}
            />
            <StorageUsage organizationId={activeOrganization.id} />
            <CompanyContacts
              key={activeOrganization.id}
              id={activeOrganization.id}
            />
            <section className="workspace-settings-section">
              <h2>{locale === "fr" ? "Abonnement" : "Subscription"}</h2>
              <p className="helper-text">
                {locale === "fr"
                  ? "La gestion des offres et de la facturation sera disponible ici plus tard."
                  : "Plan and billing management will be available here later."}
              </p>
            </section>
          </div>
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
  );
}
