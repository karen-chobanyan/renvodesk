import { Link } from "react-router";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";

export const preferencesCopy = {
  fr: {
    title: "Préférences de l’espace de travail",
    hint: "Les valeurs par défaut partagées par cette entreprise.",
    language: "Langue par défaut de l’espace de travail",
    languageHint:
      "S’applique aux personnes sans préférence personnelle. Votre langue personnelle reste prioritaire.",
    account: "Choisir ma langue dans les paramètres du compte",
    country: "Pays de l’entreprise",
    countryHint:
      "Les nouveaux PDF de brouillons utilisent ce pays. Les adresses des projets et les devis envoyés restent inchangés.",
    belgium: "Belgique",
    france: "France",
    netherlands: "Pays-Bas",
    currency: "Devise",
    currencyHint: "Fixe pour les devis et les coûts.",
    save: "Enregistrer les préférences",
    saved: "Préférences enregistrées.",
    reload: "Recharger et remplacer mes choix",
  },
  en: {
    title: "Workspace preferences",
    hint: "Shared defaults for this company.",
    language: "Default language for this workspace",
    languageHint:
      "Applies to people without a personal preference. Your personal language takes priority.",
    account: "Choose my language in account settings",
    country: "Company country",
    countryHint:
      "New draft PDFs use this country. Project addresses and sent estimates stay unchanged.",
    belgium: "Belgium",
    france: "France",
    netherlands: "Netherlands",
    currency: "Currency",
    currencyHint: "Fixed for estimates and costs.",
    save: "Save preferences",
    saved: "Preferences saved.",
    reload: "Reload and replace my choices",
  },
};
export const contactsCopy = {
  fr: {
    title: "Coordonnées pour les documents",
    hint: "Coordonnées facultatives de l’entreprise pour les PDF de devis. Les devis déjà envoyés conservent leurs coordonnées d’origine.",
    address: "Adresse de l’entreprise",
    email: "E-mail de contact",
    phone: "Téléphone",
    save: "Enregistrer les coordonnées",
    saved: "Coordonnées enregistrées.",
    reload: "Recharger et remplacer mes champs",
  },
  en: {
    title: "Document contact details",
    hint: "Optional company details for estimate PDFs. Already-sent estimates retain their original contact details.",
    address: "Company address",
    email: "Contact email",
    phone: "Phone",
    save: "Save contact details",
    saved: "Contact details saved.",
    reload: "Reload and replace my fields",
  },
};
export type PreferencesValues = {
  country: "BE" | "FR" | "NL";
  default_language: "fr" | "en";
};
export type ContactValues = {
  contact_address: string;
  contact_email: string;
  contact_phone: string;
};

export function PreferencesFields({
  value,
  onChange,
  accountHref,
}: {
  value: PreferencesValues;
  onChange: (value: PreferencesValues) => void;
  accountHref: string;
}) {
  const { locale } = useLocale();
  const c = preferencesCopy[locale];
  return (
    <>
      <div className="field">
        <label htmlFor="workspace-language">{c.language}</label>
        <select
          id="workspace-language"
          className="input"
          name="language"
          value={value.default_language}
          onChange={(e) =>
            onChange({
              ...value,
              default_language: e.target
                .value as PreferencesValues["default_language"],
            })
          }
          aria-describedby="workspace-language-hint"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
        <small id="workspace-language-hint">{c.languageHint}</small>
        <Link className="settings-inline-link" to={accountHref}>
          {c.account}
        </Link>
      </div>
      <div className="field">
        <label htmlFor="workspace-country">{c.country}</label>
        <select
          id="workspace-country"
          className="input"
          name="country"
          value={value.country}
          onChange={(e) =>
            onChange({
              ...value,
              country: e.target.value as PreferencesValues["country"],
            })
          }
          aria-describedby="workspace-country-hint"
        >
          <option value="BE">{c.belgium}</option>
          <option value="FR">{c.france}</option>
          <option value="NL">{c.netherlands}</option>
        </select>
        <small id="workspace-country-hint">{c.countryHint}</small>
      </div>
      <div className="settings-currency">
        <span>{c.currency}</span>
        <strong>EUR · €</strong>
        <small>{c.currencyHint}</small>
      </div>
    </>
  );
}

export function ContactFields({
  value,
  onChange,
}: {
  value: ContactValues;
  onChange: (value: ContactValues) => void;
}) {
  const { locale } = useLocale();
  const c = contactsCopy[locale];
  return (
    <>
      <label
        className="field settings-address"
        htmlFor="company-contact-address"
      >
        {c.address}
        <textarea
          className="input"
          id="company-contact-address"
          name="address"
          rows={3}
          maxLength={300}
          autoComplete="street-address"
          value={value.contact_address}
          onChange={(e) =>
            onChange({ ...value, contact_address: e.target.value })
          }
        />
      </label>
      {(["email", "phone"] as const).map((field) => (
        <label
          className="field"
          key={field}
          htmlFor={`company-contact-${field}`}
        >
          {c[field]}
          <Input
            id={`company-contact-${field}`}
            name={field}
            type={field === "email" ? "email" : "tel"}
            autoComplete={field === "email" ? "email" : "tel"}
            maxLength={field === "email" ? 254 : 50}
            value={value[`contact_${field}`]}
            onChange={(e) =>
              onChange({ ...value, [`contact_${field}`]: e.target.value })
            }
          />
        </label>
      ))}
    </>
  );
}
