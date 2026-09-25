import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { requireSupabase } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";
import { authErrorKey, useAuthCopy } from "./copy";

const copy = {
  fr: {
    title: "Paramètres du compte",
    hint: "Vos informations personnelles, utilisées dans tous vos espaces de travail.",
    profile: "Profil",
    fullName: "Nom complet",
    language: "Langue préférée",
    languageHint:
      "Votre choix personnel prime sur la langue par défaut de l’espace de travail.",
    saveProfile: "Enregistrer le profil",
    profileSaved: "Profil enregistré.",
    profileInvalid: "Indiquez votre nom complet (120 caractères maximum).",
    password: "Mot de passe",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le nouveau mot de passe",
    passwordHint: "Au moins 12 caractères.",
    passwordMismatch: "Les nouveaux mots de passe ne correspondent pas.",
    passwordInvalid:
      "Choisissez un nouveau mot de passe d’au moins 12 caractères.",
    passwordSame: "Le nouveau mot de passe doit être différent de l’actuel.",
    passwordChanged: "Mot de passe mis à jour.",
    changePassword: "Changer le mot de passe",
    currentPasswordInvalid: "Le mot de passe actuel est incorrect.",
    reauthentication:
      "Une nouvelle vérification est nécessaire. Utilisez le lien de réinitialisation.",
    forgotPassword: "Réinitialiser par e-mail",
    french: "Français",
    english: "English",
  },
  en: {
    title: "Account settings",
    hint: "Your personal details, shared across your workspaces.",
    profile: "Profile",
    fullName: "Full name",
    language: "Preferred language",
    languageHint:
      "Your personal choice takes priority over the workspace default.",
    saveProfile: "Save profile",
    profileSaved: "Profile saved.",
    profileInvalid: "Enter your full name (up to 120 characters).",
    password: "Password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    passwordHint: "At least 12 characters.",
    passwordMismatch: "The new passwords do not match.",
    passwordInvalid: "Choose a new password of at least 12 characters.",
    passwordSame: "The new password must differ from your current password.",
    passwordChanged: "Password updated.",
    changePassword: "Change password",
    currentPasswordInvalid: "Your current password is incorrect.",
    reauthentication:
      "An additional verification is required. Use the password reset link.",
    forgotPassword: "Reset by email",
    french: "Français",
    english: "English",
  },
};

export function AccountSettingsPage() {
  const { session } = useAuth();
  const { locale, setLocale } = useLocale();
  const authText = useAuthCopy();
  const c = copy[locale];
  const user = session?.user;
  const fullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const preferredLanguage =
    user?.user_metadata?.preferred_language === "en" ||
    user?.user_metadata?.preferred_language === "fr"
      ? user.user_metadata.preferred_language
      : locale;
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileBusy) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("fullName") ?? "").trim();
    const language = String(form.get("language") ?? "");
    setProfileError("");
    setProfileSaved(false);
    if (
      !name ||
      name.length > 120 ||
      [...name].some((character) => {
        const code = character.charCodeAt(0);
        return code < 32 || code === 127;
      }) ||
      (language !== "fr" && language !== "en")
    ) {
      setProfileError(c.profileInvalid);
      return;
    }
    setProfileBusy(true);
    try {
      const { error } = await requireSupabase().auth.updateUser({
        data: { full_name: name, preferred_language: language },
      });
      if (error) throw error;
      setLocale(language);
      setProfileSaved(true);
    } catch (error) {
      setProfileError(authText(authErrorKey(error)));
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordBusy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmation = String(data.get("confirmPassword") ?? "");
    setPasswordError("");
    setPasswordSaved(false);
    if (newPassword.length < 12 || newPassword.length > 128) {
      setPasswordError(c.passwordInvalid);
      return;
    }
    if (newPassword !== confirmation) {
      setPasswordError(c.passwordMismatch);
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError(c.passwordSame);
      return;
    }
    setPasswordBusy(true);
    try {
      const { error } = await requireSupabase().auth.updateUser({
        current_password: currentPassword,
        password: newPassword,
      });
      if (error) throw error;
      form.reset();
      setPasswordSaved(true);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : null;
      setPasswordError(
        code === "invalid_credentials"
          ? c.currentPasswordInvalid
          : code === "reauthentication_needed"
            ? c.reauthentication
            : code === "same_password"
              ? c.passwordSame
              : authText(authErrorKey(error)),
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <section className="connected-workspace account-settings-page">
      <p className="eyebrow">{authText("account")}</p>
      <h1>{c.title}</h1>
      <p className="page-description">{c.hint}</p>
      <div className="workspace-settings">
        <section className="workspace-settings-section">
          <h2>{c.profile}</h2>
          <form
            key={user?.id}
            onSubmit={saveProfile}
            className="account-settings-form"
          >
            <div className="field">
              <label htmlFor="account-full-name">{c.fullName}</label>
              <Input
                id="account-full-name"
                name="fullName"
                autoComplete="name"
                defaultValue={fullName}
                maxLength={120}
                required
                disabled={profileBusy}
              />
            </div>
            <div className="field">
              <label htmlFor="account-language">{c.language}</label>
              <select
                id="account-language"
                className="input"
                name="language"
                defaultValue={preferredLanguage}
                aria-describedby="account-language-hint"
                disabled={profileBusy}
              >
                <option value="fr">{c.french}</option>
                <option value="en">{c.english}</option>
              </select>
              <small id="account-language-hint">{c.languageHint}</small>
            </div>
            <Button type="submit" disabled={profileBusy}>
              {profileBusy ? authText("working") : c.saveProfile}
            </Button>
            {profileError && (
              <p role="alert" className="error-message">
                {profileError}
              </p>
            )}
            {profileSaved && <p role="status">{c.profileSaved}</p>}
          </form>
        </section>
        <section className="workspace-settings-section">
          <h2>{c.password}</h2>
          <form onSubmit={changePassword} className="account-settings-form">
            <div className="field">
              <label htmlFor="account-current-password">
                {c.currentPassword}
              </label>
              <Input
                id="account-current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                disabled={passwordBusy}
              />
            </div>
            <div className="field">
              <label htmlFor="account-new-password">{c.newPassword}</label>
              <Input
                id="account-new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                aria-describedby="account-password-hint"
                disabled={passwordBusy}
              />
              <small id="account-password-hint">{c.passwordHint}</small>
            </div>
            <div className="field">
              <label htmlFor="account-confirm-password">
                {c.confirmPassword}
              </label>
              <Input
                id="account-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={passwordBusy}
              />
            </div>
            <Button type="submit" disabled={passwordBusy}>
              {passwordBusy ? authText("working") : c.changePassword}
            </Button>
            {passwordError && (
              <p role="alert" className="error-message">
                {passwordError}
              </p>
            )}
            {passwordSaved && <p role="status">{c.passwordChanged}</p>}
            {passwordError === c.reauthentication && (
              <a className="auth-text-link" href="/auth/forgot">
                {c.forgotPassword}
              </a>
            )}
          </form>
        </section>
      </div>
    </section>
  );
}
