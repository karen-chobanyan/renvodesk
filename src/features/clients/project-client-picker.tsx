import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectFields } from "@/features/projects/project-fields";
import { useLocale } from "@/lib/i18n";
import { clientCopy } from "./client-copy";
import {
  type Client,
  type ClientInput,
  listClients,
  listProperties,
  type Property,
} from "./client-service";

const emptyClient: ClientInput = {
  name: "",
  kind: "individual",
  email: "",
  phone: "",
  billing_address: "",
};
export function NewProjectFields({
  org,
  locked = false,
}: {
  org: string;
  locked?: boolean;
}) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  const [rows, setRows] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [draft, setDraft] = useState<ClientInput>(emptyClient);
  const [site, setSite] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0);
  const [values, setValues] = useState({
    name: "",
    client_name: "",
    city: "",
    address: "",
  });
  const details = selected ?? draft;
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry reloads the dropdown
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void (async () => {
      try {
        const clients: Client[] = [];
        for (let offset = 0; ; offset += 20) {
          const page = await listClients(org, "", offset);
          if (!active) return;
          clients.push(...page);
          if (page.length < 20) break;
        }
        if (active) setRows(clients);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [org, reload]);
  return (
    <>
      <div className="project-directory-picker">
        <div className="project-client-heading">
          <h3>{locale === "fr" ? "1. Le client" : "1. Client"}</h3>
        </div>
        <label className="field" htmlFor="pick-client">
          {locale === "fr" ? "Client existant" : "Existing client"}
          <select
            id="pick-client"
            className="input"
            value={selected?.id ?? ""}
            disabled={loading || failed || locked}
            onChange={(event) => {
              setSelected(
                rows.find((row) => row.id === event.target.value) ?? null,
              );
              setSite(null);
              setValues((old) => ({ ...old, city: "", address: "" }));
            }}
          >
            <option value="">
              {locale === "fr"
                ? "Nouveau client — saisir les coordonnées"
                : "New client — enter details"}
            </option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        {loading && <p role="status">{c.loading}</p>}
        {failed && (
          <div role="alert">
            <p>{c.error}</p>
            <Button type="button" onClick={() => setReload((n) => n + 1)}>
              {c.retry}
            </Button>
          </div>
        )}
        <fieldset className="project-client-details">
          <legend>
            {locale === "fr" ? "Coordonnées du client" : "Client details"}
          </legend>
          <label className="field" htmlFor="project-client-kind">
            {c.kind}
            <select
              id="project-client-kind"
              className="input"
              value={details.kind}
              disabled={!!selected || locked}
              onChange={(event) =>
                setDraft((old) => ({ ...old, kind: event.target.value }))
              }
            >
              <option value="individual">{c.individual}</option>
              <option value="company">{c.company}</option>
            </select>
          </label>
          <input type="hidden" name="new_client_kind" value={details.kind} />
          {(["name", "email", "phone", "billing_address"] as const).map(
            (key) => (
              <label
                className="field"
                key={key}
                htmlFor={`project-client-${key}`}
              >
                {c[key]}
                <Input
                  id={`project-client-${key}`}
                  name={`new_client_${key}`}
                  value={details[key]}
                  readOnly={!!selected || locked}
                  required={key === "name"}
                  type={
                    key === "email" ? "email" : key === "phone" ? "tel" : "text"
                  }
                  maxLength={
                    key === "billing_address"
                      ? 300
                      : key === "name"
                        ? 120
                        : key === "phone"
                          ? 60
                          : 254
                  }
                  onChange={(event) =>
                    setDraft((old) => ({ ...old, [key]: event.target.value }))
                  }
                />
              </label>
            ),
          )}
          <p className="helper-text">
            {locked
              ? locale === "fr"
                ? "Coordonnées conservées pour réessayer l’enregistrement sans créer de doublon."
                : "Client details are retained for a retry without creating a duplicate."
              : selected
                ? locale === "fr"
                  ? "Coordonnées remplies depuis le répertoire clients."
                  : "Details filled from the client directory."
                : locale === "fr"
                  ? "Ce client sera ajouté au répertoire lors de l’enregistrement du projet."
                  : "This client will be added to your directory when you save the project."}
          </p>
        </fieldset>
        {selected && (
          <PropertyPicker
            key={selected.id}
            org={org}
            client={selected.id}
            pick={(row) => {
              setSite(row);
              setValues((old) => ({
                ...old,
                city: row?.city ?? "",
                address: row?.address ?? "",
              }));
            }}
          />
        )}
      </div>
      <input type="hidden" name="client_id" value={selected?.id ?? ""} />
      <input type="hidden" name="property_id" value={site?.id ?? ""} />
      <input type="hidden" name="client_name" value={details.name} />
      <div className="project-client-heading">
        <h3>
          {locale === "fr"
            ? "2. Le projet et son adresse"
            : "2. Project and site address"}
        </h3>
      </div>
      <ProjectFields
        hideClient
        values={values}
        onChange={(field, value) =>
          setValues((old) => ({ ...old, [field]: value }))
        }
      />
    </>
  );
}
function PropertyPicker({
  org,
  client,
  pick,
}: {
  org: string;
  client: string;
  pick: (row: Property | null) => void;
}) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  const [rows, setRows] = useState<Property[]>([]),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry reloads sites
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void listProperties(org, client)
      .then((data) => {
        if (active) {
          setRows(data);
          setMore(data.length === 20);
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
  }, [org, client, reload]);
  async function loadMore() {
    setLoading(true);
    try {
      const data = await listProperties(org, client, rows.length);
      setRows((old) => [
        ...old,
        ...data.filter((r) => !old.some((o) => o.id === r.id)),
      ]);
      setMore(data.length === 20);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <label className="field" htmlFor="pick-property">
        {c.chooseProperty}
        <select
          className="input"
          id="pick-property"
          defaultValue=""
          disabled={loading || failed}
          onChange={(e) =>
            pick(rows.find((r) => r.id === e.target.value) ?? null)
          }
        >
          <option value="">{c.none}</option>
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label} · {row.city}
            </option>
          ))}
        </select>
      </label>
      {failed && (
        <div role="alert">
          <p>{c.error}</p>
          <Button type="button" onClick={() => setReload((n) => n + 1)}>
            {c.retry}
          </Button>
        </div>
      )}
      {more && !failed && (
        <Button type="button" disabled={loading} onClick={loadMore}>
          {c.more}
        </Button>
      )}
    </>
  );
}
