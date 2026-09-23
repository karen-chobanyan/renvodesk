import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { telemetryAvailable } from "./config";
import { getConsent, saveConsent, subscribeConsent } from "./runtime";
import "./consent.css";

const copy = {
  fr: {
    settings: "Paramètres des cookies",
    customize: "Paramètres",
    title: "Vos préférences de confidentialité",
    intro:
      "RenvoDesk fonctionne sans suivi optionnel. Vous pouvez autoriser séparément les statistiques d’utilisation et les rapports d’erreurs techniques.",
    analytics: "Statistiques d’utilisation",
    diagnostics: "Rapports d’erreurs techniques",
    detail:
      "Aucun enregistrement de session ni suivi publicitaire. Votre choix est conservé pendant 180 jours et peut être retiré à tout moment via le bouton Paramètres des cookies.",
    accept: "Tout accepter",
    reject: "Tout refuser",
    save: "Enregistrer mes choix",
    policy: "Informations de confidentialité",
  },
  en: {
    settings: "Cookie Settings",
    customize: "Settings",
    title: "Your privacy preferences",
    intro:
      "RenvoDesk works without optional tracking. You can separately allow usage statistics and technical error reports.",
    analytics: "Usage statistics",
    diagnostics: "Technical error reports",
    detail:
      "No session recording or advertising tracking. Your choice is kept for 180 days and can be withdrawn at any time using Cookie Settings.",
    accept: "Accept all",
    reject: "Reject all",
    save: "Save my choices",
    policy: "Privacy information",
  },
};
export function ConsentControls({
  locale,
  placement = "floating",
}: {
  locale: "fr" | "en";
  placement?: "footer" | "floating";
}) {
  const c = copy[locale];
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [diagnostics, setDiagnostics] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!telemetryAvailable()) return;
    setReady(true);
    const update = () => {
      const consent = getConsent();
      setAnalytics(consent?.analytics ?? false);
      setDiagnostics(consent?.diagnostics ?? false);
      if (!consent) setOpen(true);
    };
    update();
    return subscribeConsent(update);
  }, []);
  function close() {
    setOpen(false);
    setExpanded(false);
    requestAnimationFrame(() =>
      trigger.current?.focus({ preventScroll: true }),
    );
  }
  function save(a: boolean, d: boolean) {
    saveConsent(a, d);
    close();
  }
  if (!ready) return null;
  return (
    <aside
      className={`privacy-controls privacy-controls-${placement}`}
      aria-label={c.settings}
    >
      <button
        ref={trigger}
        type="button"
        className="privacy-trigger"
        aria-expanded={open}
        aria-controls="privacy-panel"
        onClick={() => {
          setOpen(true);
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
          {expanded && (
            <div className="privacy-options" id="privacy-options">
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
          )}
          <p>
            {c.detail}{" "}
            <a
              href={
                locale === "fr" ? "/privacy/#storage" : "/en/privacy/#storage"
              }
            >
              {c.policy}
            </a>
          </p>
          <div className="privacy-actions">
            <button type="button" onClick={() => save(false, false)}>
              {c.reject}
            </button>
            <button
              className="privacy-accept"
              type="button"
              onClick={() => save(true, true)}
            >
              {c.accept}
            </button>
            <button
              type="button"
              className="privacy-customize"
              aria-label={c.customize}
              title={c.customize}
              aria-expanded={expanded}
              aria-controls="privacy-options"
              onClick={() => setExpanded(!expanded)}
            >
              <SlidersHorizontal size={20} aria-hidden="true" />
            </button>
            {expanded && (
              <button
                type="button"
                onClick={() => save(analytics, diagnostics)}
              >
                {c.save}
              </button>
            )}
          </div>
        </section>
      )}
    </aside>
  );
}
