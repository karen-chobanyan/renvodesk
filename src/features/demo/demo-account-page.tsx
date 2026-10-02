import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { demoMembers } from "./demo-directory";

const copy = {
  fr: {
    eyebrow: "Compte",
    title: "Paramètres du compte",
    hint: "Vos informations personnelles, utilisées dans tous vos espaces de travail.",
    profile: "Profil",
    fullName: "Nom complet",
    language: "Langue préférée",
    languageHint:
      "Votre choix personnel prime sur la langue par défaut de l’espace de travail.",
    saveProfile: "Enregistrer le profil",
    password: "Mot de passe",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le nouveau mot de passe",
    passwordHint: "Au moins 12 caractères.",
    changePassword: "Changer le mot de passe",
  },
  en: {
    eyebrow: "Account",
    title: "Account settings",
    hint: "Your personal details, shared across your workspaces.",
    profile: "Profile",
    fullName: "Full name",
    language: "Preferred language",
    languageHint:
      "Your personal choice takes priority over the workspace default.",
    saveProfile: "Save profile",
    password: "Password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    passwordHint: "At least 12 characters.",
    changePassword: "Change password",
  },
};

/** Demo account screen; the password form is shown but never submitted. */
export function DemoAccountPage() {
  const { locale, setLocale } = useLocale(),
    c = copy[locale],
    d = useDemoCopy();
  const [name, setName] = useState(demoMembers[0].name),
    [saved, setSaved] = useState(false);
  function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setName(String(form.get("fullName") ?? "").trim() || name);
    setLocale(form.get("language") === "en" ? "en" : "fr");
    setSaved(true);
  }
  return (
    <section className="connected-workspace account-settings-page">
      <p className="eyebrow">{c.eyebrow}</p>
      <h1>{c.title}</h1>
      <p className="page-description">{c.hint}</p>
      <div className="workspace-settings">
        <section className="workspace-settings-section">
          <h2>{c.profile}</h2>
          <form onSubmit={saveProfile} className="account-settings-form">
            <div className="field">
              <label htmlFor="account-full-name">{c.fullName}</label>
              <Input
                id="account-full-name"
                name="fullName"
                defaultValue={name}
                maxLength={120}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="account-language">{c.language}</label>
              <select
                id="account-language"
                className="input"
                name="language"
                defaultValue={locale}
                aria-describedby="account-language-hint"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
              <small id="account-language-hint">{c.languageHint}</small>
            </div>
            <Button type="submit">{c.saveProfile}</Button>
            {saved && <p role="status">{d.settingsSaved}</p>}
          </form>
        </section>
        <section className="workspace-settings-section">
          <h2>{c.password}</h2>
          <form className="account-settings-form">
            <fieldset className="account-settings-form" disabled>
              <div className="field">
                <label htmlFor="account-current-password">
                  {c.currentPassword}
                </label>
                <Input id="account-current-password" type="password" />
              </div>
              <div className="field">
                <label htmlFor="account-new-password">{c.newPassword}</label>
                <Input
                  id="account-new-password"
                  type="password"
                  aria-describedby="account-password-hint"
                />
                <small id="account-password-hint">{c.passwordHint}</small>
              </div>
              <div className="field">
                <label htmlFor="account-confirm-password">
                  {c.confirmPassword}
                </label>
                <Input id="account-confirm-password" type="password" />
              </div>
              <Button type="button">{c.changePassword}</Button>
            </fieldset>
            <p className="helper-text">{d.passwordDemo}</p>
          </form>
        </section>
      </div>
    </section>
  );
}
