import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { clientCopy } from "./client-copy";
import {
  type Client,
  type Property,
  saveClient,
  saveProperty,
} from "./client-service";
export function DirectoryEditor({
  org,
  clientId,
  client,
  property,
  done,
  cancel,
  clientSaved,
}: {
  org: string;
  clientId?: string;
  client?: Client;
  property?: Property;
  clientSaved?: (client: Client) => void;
  done: () => void;
  cancel: () => void;
}) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  const [id] = useState(
    () => client?.id ?? property?.id ?? crypto.randomUUID(),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<"failed" | "conflict" | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      const result = clientId
        ? await saveProperty(
            org,
            clientId,
            id,
            {
              label: text("label"),
              address: text("address"),
              city: text("city"),
              country: text("country"),
            },
            property,
          )
        : await saveClient(
            org,
            id,
            {
              name: text("name"),
              kind: text("kind"),
              email: text("email"),
              phone: text("phone"),
              billing_address: text("billing_address"),
            },
            client,
          );
      if (!result) setError("conflict");
      else {
        if (!clientId && "kind" in result) clientSaved?.(result as Client);
        done();
      }
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="company-form task-editor" onSubmit={submit}>
      <fieldset className="project-fields" disabled={busy}>
        {clientId ? (
          <>
            {(["label", "address", "city"] as const).map((field) => (
              <label
                className="field"
                key={field}
                htmlFor={`directory-${field}`}
              >
                {c[field]}
                <Input
                  id={`directory-${field}`}
                  name={field}
                  required
                  maxLength={field === "address" ? 300 : 120}
                  defaultValue={property?.[field] ?? ""}
                />
              </label>
            ))}
            <label className="field" htmlFor="directory-country">
              {c.country}
              <select
                id="directory-country"
                name="country"
                className="input"
                defaultValue={property?.country ?? "BE"}
              >
                <option value="BE">
                  {locale === "fr" ? "Belgique" : "Belgium"}
                </option>
                <option value="FR">France</option>
                <option value="NL">
                  {locale === "fr" ? "Pays-Bas" : "Netherlands"}
                </option>
              </select>
            </label>
          </>
        ) : (
          <>
            {(["name", "email", "phone", "billing_address"] as const).map(
              (field) => (
                <label
                  className="field"
                  key={field}
                  htmlFor={`directory-${field}`}
                >
                  {c[field]}
                  <Input
                    id={`directory-${field}`}
                    name={field}
                    type={field === "email" ? "email" : "text"}
                    required={field === "name"}
                    maxLength={
                      field === "name"
                        ? 120
                        : field === "email"
                          ? 254
                          : field === "phone"
                            ? 60
                            : 500
                    }
                    defaultValue={client?.[field] ?? ""}
                  />
                </label>
              ),
            )}
            <label className="field" htmlFor="directory-kind">
              {c.kind}
              <select
                className="input"
                id="directory-kind"
                name="kind"
                defaultValue={client?.kind ?? "individual"}
              >
                <option value="individual">{c.individual}</option>
                <option value="company">{c.company}</option>
              </select>
            </label>
          </>
        )}
        <div className="dialog-actions">
          <Button type="button" variant="outline" onClick={cancel}>
            {c.cancel}
          </Button>
          <Button disabled={error === "conflict"}>
            {clientId ? c.saveProperty : c.save}
          </Button>
        </div>
      </fieldset>
      {error && (
        <div role="alert">
          <p>{c[error]}</p>
          <Button type="button" onClick={done}>
            {c.reload}
          </Button>
        </div>
      )}
    </form>
  );
}
