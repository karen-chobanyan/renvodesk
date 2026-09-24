import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { useLocale } from "@/lib/i18n";
import { useOrganizationRecord } from "./organization-query";
import {
  type Organization,
  saveWorkspacePreferences,
} from "./organization-service";
import { workspaceKeys } from "./workspace-context";

const copy = {
  fr: {
    title: "Préférences de l’espace de travail",
    hint: "Ces valeurs sont partagées par les membres de cette entreprise.",
    language: "Langue par défaut",
    languageHint:
      "Appliquée si aucune langue personnelle n’a été choisie. Chacun peut garder sa propre langue d’interface.",
    french: "Français",
    english: "English",
    location: "Pays de l’entreprise",
    locationHint:
      "Ne change pas les adresses des projets ni les devis envoyés. Les PDF de brouillons utilisent le pays actuel.",
    belgium: "Belgique",
    france: "France",
    netherlands: "Pays-Bas",
    currency: "Devise financière",
    currencyHint:
      "Les devis et coûts sont actuellement enregistrés en euros. Le changement de devise n’est pas encore disponible.",
    save: "Enregistrer les préférences",
    loading: "Chargement…",
    error: "Impossible de charger les préférences.",
    failed: "Enregistrement non confirmé. Réessayez ou rechargez.",
    conflict:
      "Ces préférences ont changé ou votre accès a été retiré. Rechargez avant de modifier à nouveau.",
    reload: "Recharger et remplacer mes choix",
    retry: "Réessayer",
    saved: "Préférences enregistrées.",
  },
  en: {
    title: "Workspace preferences",
    hint: "These values are shared by members of this company.",
    language: "Default language",
    languageHint:
      "Applied when no personal language has been chosen. Each person can keep their own interface language.",
    french: "Français",
    english: "English",
    location: "Company country",
    locationHint:
      "Does not change project addresses or sent estimates. Draft PDFs use the current company country.",
    belgium: "Belgium",
    france: "France",
    netherlands: "Netherlands",
    currency: "Financial currency",
    currencyHint:
      "Estimates and costs are currently stored in euros. Changing currency is not available yet.",
    save: "Save preferences",
    loading: "Loading…",
    error: "Could not load preferences.",
    failed: "Save not confirmed. Retry or reload.",
    conflict:
      "These preferences changed or your access was removed. Reload before editing again.",
    reload: "Reload and replace my choices",
    retry: "Try again",
    saved: "Preferences saved.",
  },
};

export function WorkspacePreferences({ id }: { id: string }) {
  const { locale, saveWorkspaceLanguage } = useLocale();
  const c = copy[locale];
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const client = useQueryClient();
  const query = useOrganizationRecord(id);
  const record = query.data ?? null;
  const loading = query.isPending && query.isFetching;
  const failed = query.isError && !record;
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"failed" | "conflict" | null>(null);
  const [saved, setSaved] = useState(false);

  function refresh() {
    setReload((n) => n + 1);
    setError(null);
    void query.refetch();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record || busy || error === "conflict") return;
    const form = new FormData(event.currentTarget);
    const country = String(form.get("country"));
    const defaultLanguage = String(form.get("language"));
    if (
      !["BE", "FR", "NL"].includes(country) ||
      !["fr", "en"].includes(defaultLanguage)
    ) {
      setError("failed");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await saveWorkspacePreferences(
        id,
        record.settings_revision,
        {
          country: country as "BE" | "FR" | "NL",
          default_language: defaultLanguage as "fr" | "en",
        },
      );
      if (next) {
        client.setQueryData(
          workspaceKeys.organization(userId, id),
          (old: typeof next | null | undefined) =>
            old
              ? {
                  ...old,
                  country: next.country,
                  default_language: next.default_language,
                  settings_revision: next.settings_revision,
                }
              : next,
        );
        client.setQueryData(
          workspaceKeys.organizations(userId),
          (old: Organization[] | undefined) =>
            old?.map((row) =>
              row.id === id
                ? {
                    ...row,
                    country: next.country,
                    default_language: next.default_language,
                  }
                : row,
            ),
        );
        saveWorkspaceLanguage(id, next.default_language === "en" ? "en" : "fr");
        setSaved(true);
      } else setError("conflict");
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace-settings-section" aria-label={c.title}>
      <h2>{c.title}</h2>
      <p className="helper-text">{c.hint}</p>
      {loading ? (
        <p role="status">{c.loading}</p>
      ) : failed || !record ? (
        <div>
          <p role="alert">{c.error}</p>
          <Button variant="outline" onClick={refresh}>
            {c.retry}
          </Button>
        </div>
      ) : (
        <form
          className="workspace-preferences-form"
          key={`${record.settings_revision}:${reload}`}
          onSubmit={submit}
        >
          <fieldset className="project-fields" disabled={busy}>
            <div className="field">
              <label htmlFor="workspace-language">{c.language}</label>
              <select
                className="input"
                id="workspace-language"
                name="language"
                defaultValue={record.default_language}
                aria-describedby="workspace-language-hint"
              >
                <option value="fr">{c.french}</option>
                <option value="en">{c.english}</option>
              </select>
              <small id="workspace-language-hint">{c.languageHint}</small>
            </div>
            <div className="field">
              <label htmlFor="workspace-country">{c.location}</label>
              <select
                className="input"
                id="workspace-country"
                name="country"
                defaultValue={record.country}
                aria-describedby="workspace-country-hint"
              >
                <option value="BE">{c.belgium}</option>
                <option value="FR">{c.france}</option>
                <option value="NL">{c.netherlands}</option>
              </select>
              <small id="workspace-country-hint">{c.locationHint}</small>
            </div>
            <div className="field workspace-currency">
              <span>{c.currency}</span>
              <strong>EUR · €</strong>
              <small>{c.currencyHint}</small>
            </div>
            <div className="workspace-settings-actions">
              <Button type="submit" disabled={error === "conflict"}>
                {busy ? c.loading : c.save}
              </Button>
            </div>
          </fieldset>
          {error && (
            <div role="alert" className="workspace-settings-feedback">
              <p>{c[error]}</p>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={refresh}
              >
                {c.reload}
              </Button>
            </div>
          )}
          {saved && <p role="status">{c.saved}</p>}
        </form>
      )}
      {query.isError && record && (
        <p role="alert" className="error-message">
          {c.error}
        </p>
      )}
    </section>
  );
}
