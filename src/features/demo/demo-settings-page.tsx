import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatStorageBytes } from "@/features/storage-usage/storage-model";
import { useDemo } from "@/lib/demo-store";
import { type Locale, useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { demoStorage } from "./demo-directory";

const copy = {
  fr: {
    settings: "Paramètres",
    preferences: "Préférences de l’espace de travail",
    preferencesHint:
      "Ces valeurs sont partagées par les membres de cette entreprise.",
    language: "Langue par défaut de l’espace de travail",
    languageHint:
      "Appliquée si aucune langue personnelle n’a été choisie. Chacun peut garder sa propre langue d’interface.",
    country: "Pays de l’entreprise",
    countryHint:
      "Ne change pas les adresses des projets ni les devis envoyés. Les PDF de brouillons utilisent le pays actuel.",
    belgium: "Belgique",
    france: "France",
    netherlands: "Pays-Bas",
    currency: "Devise financière",
    currencyHint:
      "Les devis et coûts sont actuellement enregistrés en euros. Le changement de devise n’est pas encore disponible.",
    savePreferences: "Enregistrer les préférences",
    storage: "Stockage",
    account: "Compte · toutes vos entreprises",
    workspace: "Cette entreprise",
    used: "utilisés",
    reserved: "réservés pour des imports en cours",
    available: "disponibles",
    contacts: "Coordonnées pour les documents",
    contactsHint: "Facultatif. Ces coordonnées figurent sur les PDF de devis.",
    address: "Adresse de l’entreprise",
    email: "E-mail de contact",
    phone: "Téléphone",
    saveContacts: "Enregistrer les coordonnées",
    subscription: "Abonnement",
    subscriptionHint:
      "La gestion des offres et de la facturation sera disponible ici plus tard.",
  },
  en: {
    settings: "Settings",
    preferences: "Workspace preferences",
    preferencesHint: "These values are shared by members of this company.",
    language: "Default language for this workspace",
    languageHint:
      "Applied when no personal language has been chosen. Each person can keep their own interface language.",
    country: "Company country",
    countryHint:
      "Does not change project addresses or sent estimates. Draft PDFs use the current company country.",
    belgium: "Belgium",
    france: "France",
    netherlands: "Netherlands",
    currency: "Financial currency",
    currencyHint:
      "Estimates and costs are currently stored in euros. Changing currency is not available yet.",
    savePreferences: "Save preferences",
    storage: "Storage",
    account: "Account · all your companies",
    workspace: "This company",
    used: "used",
    reserved: "reserved for incomplete uploads",
    available: "available",
    contacts: "Document contact details",
    contactsHint: "Optional. These details appear on estimate PDFs.",
    address: "Company address",
    email: "Contact email",
    phone: "Phone",
    saveContacts: "Save contact details",
    subscription: "Subscription",
    subscriptionHint:
      "Plan and billing management will be available here later.",
  },
} satisfies Record<Locale, Record<string, string>>;

export function DemoSettingsPage() {
  const { locale } = useLocale(),
    c = copy[locale],
    d = useDemoCopy();
  const { company, saveCompany } = useDemo();
  const [saved, setSaved] = useState<"preferences" | "contacts" | null>(null);
  function savePreferences(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    saveCompany({
      language: form.get("language") === "en" ? "en" : "fr",
      country: String(form.get("country")) as typeof company.country,
    });
    setSaved("preferences");
  }
  function saveContacts(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    saveCompany({
      contact_address: value("address"),
      contact_email: value("email"),
      contact_phone: value("phone"),
    });
    setSaved("contacts");
  }
  return (
    <section className="connected-workspace">
      <p className="eyebrow">{c.settings}</p>
      <h1>{c.settings}</h1>
      <p className="page-description">{company.name}</p>
      <div className="workspace-settings">
        <section
          className="workspace-settings-section"
          aria-label={c.preferences}
        >
          <h2>{c.preferences}</h2>
          <p className="helper-text">{c.preferencesHint}</p>
          <form
            className="workspace-preferences-form"
            onSubmit={savePreferences}
          >
            <fieldset className="project-fields">
              <div className="field">
                <label htmlFor="workspace-language">{c.language}</label>
                <select
                  className="input"
                  id="workspace-language"
                  name="language"
                  defaultValue={company.language}
                  aria-describedby="workspace-language-hint"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
                <small id="workspace-language-hint">{c.languageHint}</small>
              </div>
              <div className="field">
                <label htmlFor="workspace-country">{c.country}</label>
                <select
                  className="input"
                  id="workspace-country"
                  name="country"
                  defaultValue={company.country}
                  aria-describedby="workspace-country-hint"
                >
                  <option value="BE">{c.belgium}</option>
                  <option value="FR">{c.france}</option>
                  <option value="NL">{c.netherlands}</option>
                </select>
                <small id="workspace-country-hint">{c.countryHint}</small>
              </div>
              <div className="field workspace-currency">
                <span>{c.currency}</span>
                <strong>EUR · €</strong>
                <small>{c.currencyHint}</small>
              </div>
              <div className="workspace-settings-actions">
                <Button type="submit">{c.savePreferences}</Button>
              </div>
            </fieldset>
            {saved === "preferences" && <p role="status">{d.settingsSaved}</p>}
          </form>
        </section>
        <section className="storage-usage" aria-label={c.storage}>
          <h2>{c.storage}</h2>
          {(
            [
              ["account", c.account],
              ["workspace", c.workspace],
            ] as const
          ).map(([key, label]) => {
            const scope = demoStorage[key];
            const charged = scope.used + scope.reserved;
            return (
              <div className="storage-usage-row" key={key}>
                <strong>{label}</strong>
                <progress
                  value={charged}
                  max={scope.limit}
                  aria-label={label}
                />
                <p>
                  {formatStorageBytes(scope.used, locale)} {c.used} ·{" "}
                  {formatStorageBytes(scope.reserved, locale)} {c.reserved} ·{" "}
                  {formatStorageBytes(scope.limit - charged, locale)}{" "}
                  {c.available} / {formatStorageBytes(scope.limit, locale)}
                </p>
              </div>
            );
          })}
          <p className="helper-text">{d.storageDemo}</p>
        </section>
        <details className="saved-projects" open>
          <summary>{c.contacts}</summary>
          <p className="helper-text">{c.contactsHint}</p>
          <form className="company-form" onSubmit={saveContacts}>
            <fieldset className="project-fields">
              {(["address", "email", "phone"] as const).map((field) => (
                <label
                  className="field"
                  key={field}
                  htmlFor={`company-contact-${field}`}
                >
                  {c[field]}
                  <Input
                    id={`company-contact-${field}`}
                    name={field}
                    type={field === "email" ? "email" : "text"}
                    maxLength={
                      field === "address" ? 300 : field === "email" ? 254 : 50
                    }
                    defaultValue={company[`contact_${field}`]}
                  />
                </label>
              ))}
              <Button>{c.saveContacts}</Button>
            </fieldset>
            {saved === "contacts" && <p role="status">{d.settingsSaved}</p>}
          </form>
        </details>
        <section className="workspace-settings-section">
          <h2>{c.subscription}</h2>
          <p className="helper-text">{c.subscriptionHint}</p>
        </section>
      </div>
    </section>
  );
}
