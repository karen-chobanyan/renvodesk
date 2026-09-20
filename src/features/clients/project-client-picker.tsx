import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectFields } from "@/features/projects/project-fields";
import { useLocale } from "@/lib/i18n";
import { clientCopy } from "./client-copy";
import {
  type Client,
  listClients,
  listProperties,
  type Property,
} from "./client-service";
export function NewProjectFields({ org }: { org: string }) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  const [rows, setRows] = useState<Client[]>([]),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0),
    [selected, setSelected] = useState<Client | null>(null),
    [site, setSite] = useState<Property | null>(null);
  const [values, setValues] = useState({
    name: "",
    client_name: "",
    city: "",
    address: "",
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry reloads picker
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void listClients(org, search)
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
  }, [org, search, reload]);
  async function loadMore() {
    setLoading(true);
    try {
      const data = await listClients(org, search, rows.length);
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
      <div className="project-directory-picker">
        <label className="field" htmlFor="pick-client-search">
          {c.search}
          <Input
            id="pick-client-search"
            value={query}
            maxLength={120}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => setSearch(query)}
        >
          {c.submit}
        </Button>
        <label className="field" htmlFor="pick-client">
          {c.choose}
          <select
            id="pick-client"
            className="input"
            value={selected?.id ?? ""}
            disabled={loading || failed}
            onChange={(e) => {
              const row = rows.find((r) => r.id === e.target.value) ?? null;
              setSelected(row);
              setSite(null);
              setValues((old) => ({
                ...old,
                client_name: row?.name ?? "",
                city: "",
                address: "",
              }));
            }}
          >
            <option value="">{c.none}</option>
            {selected && !rows.some((r) => r.id === selected.id) && (
              <option value={selected.id}>{selected.name}</option>
            )}
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
        {more && !failed && (
          <Button type="button" disabled={loading} onClick={loadMore}>
            {c.more}
          </Button>
        )}
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
        <p className="helper-text">{c.snapshot}</p>
      </div>
      <input type="hidden" name="client_id" value={selected?.id ?? ""} />
      <input type="hidden" name="property_id" value={site?.id ?? ""} />
      <ProjectFields
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
