import { type FormEvent, type ReactNode, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsSection } from "@/features/organizations/settings-layout";
import { type Locale, useLocale } from "@/lib/i18n";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { accountSettingsCopy } from "./account-settings-copy";
import { type AuthKey, authErrorKey, useAuthCopy } from "./copy";

export type AccountProfile = { name: string; language: Locale };
type PasswordFieldName = "current" | "new" | "confirm";
type PasswordError =
  | {
      kind: "field";
      field: PasswordFieldName;
      key:
        | "currentRequired"
        | "passwordInvalid"
        | "passwordMismatch"
        | "passwordSame"
        | "currentPasswordInvalid";
    }
  | { kind: "auth"; key: AuthKey }
  | { kind: "reauthentication" };
type ProfileError = { kind: "name" } | { kind: "auth"; key: AuthKey };

function PasswordField({
  field,
  label,
  hint,
  error,
  children,
}: {
  field: PasswordFieldName;
  label: string;
  hint?: string;
  error?: string;
  children?: ReactNode;
}) {
  const { locale } = useLocale();
  const c = accountSettingsCopy[locale];
  const [visible, setVisible] = useState(false);
  const id = `account-${field}-password`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="account-password-input">
        <Input
          id={id}
          name={`${field}Password`}
          type={visible ? "text" : "password"}
          autoComplete={
            field === "current" ? "current-password" : "new-password"
          }
          minLength={field === "current" ? undefined : 12}
          maxLength={field === "current" ? undefined : 128}
          required
          aria-invalid={!!error}
          aria-describedby={
            [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        <Button
          type="button"
          variant="ghost"
          aria-controls={id}
          aria-label={`${visible ? c.hide : c.show} — ${label}`}
          aria-pressed={visible}
          onClick={() => setVisible((old) => !old)}
        >
          {visible ? c.hide : c.show}
        </Button>
      </div>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <p id={`${id}-error`} className="error-message" role="alert">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}

/** Shared UI; live Auth operations are supplied by the live route only. Password
 * values stay in uncontrolled inputs and short-lived submission variables. */
export function AccountSettingsView({
  email,
  initialProfile,
  onSaveProfile,
  onChangePassword,
  demoNote,
  profileSavedLabel,
}: {
  email: string;
  initialProfile: AccountProfile;
  onSaveProfile: (profile: AccountProfile) => Promise<AccountProfile>;
  onChangePassword?: (
    currentPassword: string,
    password: string,
  ) => Promise<void>;
  demoNote?: string;
  profileSavedLabel?: string;
}) {
  const { locale, setLocale } = useLocale();
  const c = accountSettingsCopy[locale];
  const authText = useAuthCopy();
  const [base, setBase] = useState(initialProfile),
    [profile, setProfile] = useState(initialProfile);
  const [profileBusy, setProfileBusy] = useState(false),
    [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<ProfileError | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false),
    [passwordDirty, setPasswordDirty] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false),
    [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<PasswordError | null>(
    null,
  );
  const profileForm = useRef<HTMLFormElement>(null),
    passwordForm = useRef<HTMLFormElement>(null);
  const passwordTrigger = useRef<HTMLButtonElement>(null);
  const passwordCancel = useRef<HTMLButtonElement>(null);
  const passwordFeedback = useRef<HTMLParagraphElement>(null),
    profileFeedback = useRef<HTMLParagraphElement>(null);
  const dirty =
    profile.name !== base.name || profile.language !== base.language;
  useUnsavedChangesGuard(
    dirty || passwordDirty || profileBusy || passwordBusy,
    c.leave,
  );

  function editProfile(next: AccountProfile) {
    setProfile(next);
    setProfileSaved(false);
    setProfileError(null);
  }
  function focusName() {
    requestAnimationFrame(() =>
      profileForm.current
        ?.querySelector<HTMLInputElement>("input[name=fullName]")
        ?.focus(),
    );
  }
  function focusPassword(field: PasswordFieldName) {
    requestAnimationFrame(() =>
      passwordForm.current
        ?.querySelector<HTMLInputElement>(`input[name=${field}Password]`)
        ?.focus(),
    );
  }
  function closePassword() {
    passwordForm.current?.reset();
    setPasswordOpen(false);
    setPasswordDirty(false);
    setPasswordError(null);
    requestAnimationFrame(() => passwordTrigger.current?.focus());
  }
  function passwordInput() {
    // Track only whether fields have content; never put their values in React state.
    setPasswordDirty(
      Array.from(
        passwordForm.current?.querySelectorAll<HTMLInputElement>("input") ?? [],
      ).some((input) => input.value.length > 0),
    );
    setPasswordError(null);
    setPasswordSaved(false);
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileBusy || !dirty) return;
    setProfileSaved(false);
    setProfileError(null);
    const name = profile.name.trim();
    if (
      !name ||
      name.length > 120 ||
      [...name].some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      )
    ) {
      setProfileError({ kind: "name" });
      focusName();
      return;
    }
    setProfileBusy(true);
    try {
      const next = await onSaveProfile({ name, language: profile.language });
      setBase(next);
      setProfile(next);
      setLocale(next.language);
      setProfileSaved(true);
    } catch (error) {
      setProfileError({ kind: "auth", key: authErrorKey(error) });
      requestAnimationFrame(() => profileFeedback.current?.focus());
    } finally {
      setProfileBusy(false);
    }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordBusy || !onChangePassword) return;
    const form = event.currentTarget,
      data = new FormData(form);
    const current = String(data.get("currentPassword") ?? ""),
      next = String(data.get("newPassword") ?? ""),
      confirm = String(data.get("confirmPassword") ?? "");
    setPasswordError(null);
    setPasswordSaved(false);
    const invalid: PasswordError | null = !current
      ? { kind: "field", field: "current", key: "currentRequired" }
      : next.length < 12 || next.length > 128
        ? { kind: "field", field: "new", key: "passwordInvalid" }
        : next === current
          ? { kind: "field", field: "new", key: "passwordSame" }
          : next !== confirm
            ? { kind: "field", field: "confirm", key: "passwordMismatch" }
            : null;
    if (invalid?.kind === "field") {
      setPasswordError(invalid);
      focusPassword(invalid.field);
      return;
    }
    setPasswordBusy(true);
    try {
      await onChangePassword(current, next);
      closePassword();
      setPasswordSaved(true);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : null;
      if (code === "invalid_credentials") {
        setPasswordError({
          kind: "field",
          field: "current",
          key: "currentPasswordInvalid",
        });
        focusPassword("current");
      } else if (code === "same_password") {
        setPasswordError({ kind: "field", field: "new", key: "passwordSame" });
        focusPassword("new");
      } else {
        setPasswordError(
          code === "reauthentication_needed"
            ? { kind: "reauthentication" }
            : { kind: "auth", key: authErrorKey(error) },
        );
        requestAnimationFrame(() => passwordFeedback.current?.focus());
      }
    } finally {
      setPasswordBusy(false);
    }
  }
  const fieldError = (field: PasswordFieldName) =>
    passwordError?.kind === "field" && passwordError.field === field
      ? c[passwordError.key]
      : undefined;
  return (
    <section
      className="connected-workspace account-settings-page"
      aria-labelledby="account-settings-title"
    >
      <header className="project-register-header">
        <div>
          <h1 id="account-settings-title">{c.title}</h1>
          <p className="page-description">{c.hint}</p>
        </div>
      </header>
      <div className="settings-sections">
        <SettingsSection title={c.profile} hint={c.profileHint}>
          <div className="account-sign-in-email">
            <span>{c.email}</span>
            <strong>{email}</strong>
            <small>{c.emailHint}</small>
          </div>
          <form
            className="settings-form"
            ref={profileForm}
            onSubmit={saveProfile}
            noValidate
          >
            <fieldset disabled={profileBusy}>
              <div className="settings-fields">
                <div className="field">
                  <label htmlFor="account-full-name">{c.fullName}</label>
                  <Input
                    id="account-full-name"
                    name="fullName"
                    autoComplete="name"
                    value={profile.name}
                    onChange={(e) =>
                      editProfile({ ...profile, name: e.target.value })
                    }
                    maxLength={120}
                    required
                    aria-invalid={profileError?.kind === "name"}
                    aria-describedby={
                      profileError?.kind === "name"
                        ? "account-name-error"
                        : undefined
                    }
                  />
                  {profileError?.kind === "name" && (
                    <p
                      id="account-name-error"
                      className="error-message"
                      role="alert"
                    >
                      {c.profileInvalid}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="account-language">{c.language}</label>
                  <select
                    id="account-language"
                    className="input"
                    name="language"
                    value={profile.language}
                    onChange={(e) =>
                      editProfile({
                        ...profile,
                        language: e.target.value as Locale,
                      })
                    }
                    aria-describedby="account-language-hint"
                  >
                    <option value="fr">{c.french}</option>
                    <option value="en">{c.english}</option>
                  </select>
                  <small id="account-language-hint">{c.languageHint}</small>
                </div>
              </div>
              <div className="settings-form-actions">
                <Button type="submit" disabled={!dirty}>
                  {profileBusy ? c.saving : c.saveProfile}
                </Button>
                {(dirty || profileError) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setProfile(base);
                      setProfileError(null);
                      setProfileSaved(false);
                      focusName();
                    }}
                  >
                    {c.cancel}
                  </Button>
                )}
                <span role="status">
                  {profileBusy
                    ? c.saving
                    : dirty
                      ? c.unsaved
                      : profileSaved
                        ? (profileSavedLabel ?? c.profileSaved)
                        : ""}
                </span>
              </div>
            </fieldset>
            {profileError?.kind === "auth" && (
              <p
                ref={profileFeedback}
                tabIndex={-1}
                role="alert"
                className="error-message"
              >
                {authText(profileError.key)}
              </p>
            )}
          </form>
        </SettingsSection>
        <SettingsSection title={c.password} hint={c.securityHint}>
          {demoNote && (
            <p className="account-demo-note helper-text">{demoNote}</p>
          )}
          {!passwordOpen ? (
            <Button
              type="button"
              variant="outline"
              ref={passwordTrigger}
              aria-expanded={false}
              aria-controls="account-password-form"
              onClick={() => {
                setPasswordOpen(true);
                setPasswordSaved(false);
                if (onChangePassword) focusPassword("current");
                else
                  requestAnimationFrame(() => passwordCancel.current?.focus());
              }}
            >
              {c.changePassword}
            </Button>
          ) : (
            <form
              id="account-password-form"
              ref={passwordForm}
              className="settings-form account-password-form"
              onSubmit={changePassword}
              onInput={passwordInput}
              noValidate
            >
              <fieldset disabled={passwordBusy || !onChangePassword}>
                <div className="account-password-fields">
                  <PasswordField
                    field="current"
                    label={c.currentPassword}
                    error={fieldError("current")}
                  >
                    {onChangePassword ? (
                      <Link className="settings-inline-link" to="/auth/forgot">
                        {c.forgotPassword}
                      </Link>
                    ) : (
                      <small>{c.recoveryDemo}</small>
                    )}
                  </PasswordField>
                  <PasswordField
                    field="new"
                    label={c.newPassword}
                    hint={c.passwordHint}
                    error={fieldError("new")}
                  />
                  <PasswordField
                    field="confirm"
                    label={c.confirmPassword}
                    error={fieldError("confirm")}
                  />
                </div>
              </fieldset>
              <div className="settings-form-actions">
                <Button
                  type="submit"
                  disabled={passwordBusy || !onChangePassword}
                >
                  {passwordBusy ? c.saving : c.changePassword}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  ref={passwordCancel}
                  disabled={passwordBusy}
                  onClick={closePassword}
                >
                  {c.cancel}
                </Button>
                <span role="status">
                  {passwordBusy
                    ? c.saving
                    : passwordDirty
                      ? c.passwordPending
                      : ""}
                </span>
              </div>
              {passwordError && passwordError.kind !== "field" && (
                <p
                  ref={passwordFeedback}
                  tabIndex={-1}
                  role="alert"
                  className="error-message"
                >
                  {passwordError.kind === "reauthentication"
                    ? c.reauthentication
                    : authText(passwordError.key)}
                </p>
              )}
            </form>
          )}
          {passwordSaved && (
            <p role="status" className="account-password-success">
              {c.passwordChanged}
            </p>
          )}
        </SettingsSection>
      </div>
    </section>
  );
}
