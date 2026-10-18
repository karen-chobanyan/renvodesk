import { ArrowUpRight } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";

export const settingsCopy = {
  fr: {
    title: "Paramètres",
    hint: "Coordonnées de l’entreprise, préférences et stockage.",
    related: "À découvrir aussi",
    team: "Équipe",
    teamHint: "Membres et invitations de cette entreprise.",
    account: "Paramètres du compte",
    accountHint: "Votre profil, votre langue et votre mot de passe.",
    cancel: "Annuler",
    unsaved: "Modifications non enregistrées",
    saving: "Enregistrement…",
    leave: "Quitter sans enregistrer les modifications des paramètres ?",
    replace:
      "Remplacer vos modifications par les dernières valeurs enregistrées ?",
    failed:
      "Enregistrement non confirmé. Vos modifications sont conservées. Réessayez ou rechargez.",
    conflict:
      "Ces paramètres ont changé ou votre accès a été retiré. Rechargez avant de modifier à nouveau.",
    reloadFailed: "Impossible de recharger. Vos modifications sont conservées.",
    loading: "Chargement…",
    retry: "Réessayer",
    loadFailed: "Impossible de charger les paramètres.",
  },
  en: {
    title: "Settings",
    hint: "Company contact details, workspace preferences and storage.",
    related: "Related settings",
    team: "Team",
    teamHint: "Members and invitations for this company.",
    account: "Account settings",
    accountHint: "Your profile, personal language and password.",
    cancel: "Cancel",
    unsaved: "Unsaved changes",
    saving: "Saving…",
    leave: "Leave without saving your settings changes?",
    replace: "Replace your changes with the latest saved values?",
    failed: "Save not confirmed. Your changes are preserved. Retry or reload.",
    conflict:
      "These settings changed or your access was removed. Reload before editing again.",
    reloadFailed: "Could not reload. Your changes are preserved.",
    loading: "Loading…",
    retry: "Try again",
    loadFailed: "Could not load settings.",
  },
};

const DirtyContext = createContext<
  ((key: string, dirty: boolean) => void) | null
>(null);

export function SettingsLayout({
  company,
  teamHref,
  accountHref,
  children,
}: {
  company: string;
  teamHref: string;
  accountHref: string;
  children: ReactNode;
}) {
  const { locale } = useLocale();
  const c = settingsCopy[locale];
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const report = useCallback((key: string, value: boolean) => {
    setDirty((old) => (old[key] === value ? old : { ...old, [key]: value }));
  }, []);
  useUnsavedChangesGuard(Object.values(dirty).some(Boolean), c.leave);
  return (
    <DirtyContext.Provider value={report}>
      <section className="settings-page" aria-labelledby="settings-title">
        <header className="project-register-header">
          <div>
            <h1 id="settings-title">{c.title}</h1>
            <p className="page-description">
              <strong>{company}</strong> · {c.hint}
            </p>
          </div>
        </header>
        <div className="settings-sections">{children}</div>
        <nav className="settings-related" aria-label={c.related}>
          <h2>{c.related}</h2>
          <Link to={teamHref}>
            <span>
              <strong>{c.team}</strong>
              <small>{c.teamHint}</small>
            </span>
            <ArrowUpRight size={18} />
          </Link>
          <Link to={accountHref}>
            <span>
              <strong>{c.account}</strong>
              <small>{c.accountHint}</small>
            </span>
            <ArrowUpRight size={18} />
          </Link>
        </nav>
      </section>
    </DirtyContext.Provider>
  );
}

export function SettingsSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-section" aria-label={title}>
      <div className="settings-section-heading">
        <h2>{title}</h2>
        <p className="helper-text">{hint}</p>
      </div>
      <div className="settings-section-content">{children}</div>
    </section>
  );
}

export type SettingsSnapshot<T> = { value: T; revision: number };
export type SettingsFormProps<T> = {
  name: string;
  snapshot: SettingsSnapshot<T>;
  saveLabel: string;
  savedLabel: string;
  reloadLabel: string;
  onSave: (value: T, revision: number) => Promise<SettingsSnapshot<T> | null>;
  onReload: () => Promise<SettingsSnapshot<T> | null>;
  children: (value: T, change: (value: T) => void) => ReactNode;
};

/** Keep the edited values and their original revision together until an explicit
 * save, cancel or successful reload. Query refreshes must never replace a draft. */
export function SettingsForm<T>({
  name,
  snapshot,
  saveLabel,
  savedLabel,
  reloadLabel,
  onSave,
  onReload,
  children,
}: SettingsFormProps<T>) {
  const { locale } = useLocale();
  const c = settingsCopy[locale];
  const formRef = useRef<HTMLFormElement>(null);
  const [base, setBase] = useState(snapshot);
  const [draft, setDraft] = useState(snapshot.value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<
    "failed" | "conflict" | "reloadFailed" | null
  >(null);
  const [conflicted, setConflicted] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base.value);
  const report = useContext(DirtyContext);
  useEffect(() => {
    report?.(name, dirty || busy);
    return () => report?.(name, false);
  }, [report, name, dirty, busy]);
  useUnsavedChangesGuard(!report && (dirty || busy), c.leave);
  function replace(next: SettingsSnapshot<T>) {
    setBase(next);
    setDraft(next.value);
    setError(null);
    setConflicted(false);
    setSaved(false);
  }
  function focusFirstField() {
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>("input, textarea, select")
        ?.focus(),
    );
  }
  async function reload() {
    if (busy || (dirty && !window.confirm(c.replace))) return;
    setBusy(true);
    try {
      const next = await onReload();
      if (next) {
        replace(next);
        focusFirstField();
      } else setError("reloadFailed");
    } catch {
      setError("reloadFailed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      ref={formRef}
      className="settings-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!dirty || busy || conflicted) return;
        setBusy(true);
        setError(null);
        setSaved(false);
        try {
          const next = await onSave(draft, base.revision);
          if (next) {
            replace(next);
            setSaved(true);
          } else {
            setError("conflict");
            setConflicted(true);
          }
        } catch {
          setError("failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <div className="settings-fields">
          {children(draft, (value) => {
            setDraft(value);
            setSaved(false);
          })}
        </div>
        <div className="settings-form-actions">
          <Button type="submit" disabled={!dirty || conflicted}>
            {busy ? c.saving : saveLabel}
          </Button>
          {(dirty || error) && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (conflicted) {
                  setDraft(base.value);
                  setSaved(false);
                } else replace(base);
                focusFirstField();
              }}
            >
              {c.cancel}
            </Button>
          )}
          <span role="status">
            {busy ? c.loading : dirty ? c.unsaved : saved ? savedLabel : ""}
          </span>
        </div>
      </fieldset>
      {error && (
        <div className="settings-form-error" role="alert">
          <p>{c[error]}</p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void reload()}
          >
            {reloadLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
