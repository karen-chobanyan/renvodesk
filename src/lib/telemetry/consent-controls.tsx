import { useEffect, useRef, useState } from "react";
import { telemetryAvailable } from "./config";
import { getConsent, saveConsent, subscribeConsent } from "./runtime";
import "./consent.css";

const copy = {
  fr: {
    settings: "Confidentialité",
    title: "Vos préférences de confidentialité",
    intro:
      "RenvoDesk fonctionne sans suivi optionnel. Vous pouvez autoriser séparément les statistiques d’utilisation (Google Analytics) et les rapports d’erreurs techniques (Sentry).",
    analytics: "Statistiques d’utilisation",
    diagnostics: "Rapports d’erreurs techniques",
    detail:
      "Aucun enregistrement de session ni suivi publicitaire. Votre choix est conservé pendant 180 jours et peut être modifié à tout moment.",
    accept: "Tout accepter",
    reject: "Tout refuser",
    save: "Enregistrer mes choix",
    close: "Fermer",
    policy: "Informations de confidentialité",
  },
  en: {
    settings: "Privacy settings",
    title: "Your privacy preferences",
    intro:
      "RenvoDesk works without optional tracking. You can separately allow usage statistics (Google Analytics) and technical error reports (Sentry).",
    analytics: "Usage statistics",
    diagnostics: "Technical error reports",
    detail:
      "No session recording or advertising tracking. Your choice is kept for 180 days and can be changed at any time.",
    accept: "Accept all",
    reject: "Reject all",
    save: "Save my choices",
    close: "Close",
    policy: "Privacy information",
  },
};
export function ConsentControls({ locale }: { locale: "fr" | "en" }) {
  const c = copy[locale];
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [diagnostics, setDiagnostics] = useState(false);
  const [hasChoice, setHasChoice] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!telemetryAvailable()) return;
    setReady(true);
    const update = () => {
      const consent = getConsent();
      setHasChoice(!!consent);
      setAnalytics(consent?.analytics ?? false);
      setDiagnostics(consent?.diagnostics ?? false);
      if (!consent) setOpen(true);
    };
    update();
    return subscribeConsent(update);
  }, []);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function save(a: boolean, d: boolean) {
    saveConsent(a, d);
    close();
  }
  if (!ready) return null;
  return (
    <aside className="privacy-controls" aria-label={c.settings}>
      <button
        ref={trigger}
        type="button"
        className="privacy-trigger"
        aria-expanded={open}
        aria-controls="privacy-panel"
        onClick={() => {
          setOpen(!open);
        }}
      >
        {c.settings}
      </button>
      {open && (
        <section
          className="privacy-panel"
          id="privacy-panel"
          aria-labelledby="privacy-title"
        >
          <h2 id="privacy-title">{c.title}</h2>
          <p>{c.intro}</p>
          <div className="privacy-options">
            <label>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              {c.analytics}
            </label>
            <label>
              <input
                type="checkbox"
                checked={diagnostics}
                onChange={(e) => setDiagnostics(e.target.checked)}
              />
              {c.diagnostics}
            </label>
          </div>
          <p>
            {c.detail}{" "}
            <a href={locale === "fr" ? "/privacy" : "/en/privacy"}>
              {c.policy}
            </a>
          </p>
          <div className="privacy-actions">
            <button type="button" onClick={() => save(false, false)}>
              {c.reject}
            </button>
            <button type="button" onClick={() => save(true, true)}>
              {c.accept}
            </button>
            <button type="button" onClick={() => save(analytics, diagnostics)}>
              {c.save}
            </button>
            {hasChoice && (
              <button type="button" onClick={close}>
                {c.close}
              </button>
            )}
          </div>
        </section>
      )}
    </aside>
  );
}
