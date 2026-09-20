import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { getOrganization, saveContacts } from "./organization-service";

const copy = {
  fr: {
    title: "Coordonnées pour les documents",
    hint: "Facultatif. Ces coordonnées figurent sur les PDF de devis.",
    address: "Adresse de l’entreprise",
    email: "E-mail de contact",
    phone: "Téléphone",
    save: "Enregistrer les coordonnées",
    loading: "Chargement…",
    error: "Impossible de charger les coordonnées.",
    failed: "Enregistrement non confirmé. Réessayez ou rechargez.",
    conflict:
      "Ces coordonnées ont changé ou votre accès a été retiré. Rechargez avant de modifier à nouveau.",
    reload: "Recharger et remplacer mes champs",
    retry: "Réessayer",
    saved: "Coordonnées enregistrées.",
  },
  en: {
    title: "Document contact details",
    hint: "Optional. These details appear on estimate PDFs.",
    address: "Company address",
    email: "Contact email",
    phone: "Phone",
    save: "Save contact details",
    loading: "Loading…",
    error: "Could not load contact details.",
    failed: "Save not confirmed. Retry or reload.",
    conflict:
      "These details changed or your access was removed. Reload before editing again.",
    reload: "Reload and replace my fields",
    retry: "Try again",
    saved: "Contact details saved.",
  },
};
export function CompanyContacts({ id }: { id: string }) {
  const { locale } = useLocale(),
    c = copy[locale];
  const [record, setRecord] =
      useState<Awaited<ReturnType<typeof getOrganization>>>(null),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<"failed" | "conflict" | null>(null),
    [saved, setSaved] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit retry refreshes contacts
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void getOrganization(id)
      .then((data) => {
        if (active) {
          setRecord(data);
          setError(null);
          setSaved(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, reload]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!record || busy) return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await saveContacts(id, record.contact_revision, {
        contact_address: String(form.get("address") ?? "").trim(),
        contact_email: String(form.get("email") ?? "").trim(),
        contact_phone: String(form.get("phone") ?? "").trim(),
      });
      if (next) {
        setRecord(next);
        setSaved(true);
      } else setError("conflict");
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="saved-projects">
      <summary>{c.title}</summary>
      <p className="helper-text">{c.hint}</p>
      {loading ? (
        <p role="status">{c.loading}</p>
      ) : failed || !record ? (
        <>
          <p role="alert">{c.error}</p>
          <Button onClick={() => setReload((n) => n + 1)}>{c.retry}</Button>
        </>
      ) : (
        <form
          key={`${record.contact_revision}:${reload}`}
          className="company-form"
          onSubmit={submit}
        >
          <fieldset className="project-fields" disabled={busy}>
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
                  defaultValue={record[`contact_${field}`]}
                />
              </label>
            ))}
            <Button disabled={error === "conflict"}>
              {busy ? c.loading : c.save}
            </Button>
          </fieldset>
          {error && (
            <div role="alert">
              <p>{c[error]}</p>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setReload((n) => n + 1)}
              >
                {c.reload}
              </Button>
            </div>
          )}
          {saved && <p role="status">{c.saved}</p>}
        </form>
      )}
    </details>
  );
}
