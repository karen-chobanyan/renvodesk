import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { clientCopy } from "./client-copy";
import {
  type Client,
  listClients,
  listProperties,
  type Property,
} from "./client-service";
import { DirectoryEditor } from "./directory-editor";
export function ClientsPage() {
  const { organizationId = "" } = useParams();
  return <ClientDirectory key={organizationId} org={organizationId} />;
}
function ClientDirectory({ org }: { org: string }) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [reload, setReload] = useState(0),
    [rows, setRows] = useState<Client[]>([]),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [more, setMore] = useState(false),
    [edit, setEdit] = useState<Client | "new" | null>(null),
    [selected, setSelected] = useState<Client | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload refreshes after save
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
    <AppShell live>
      <Link className="back-link" to={`/workspace?company=${org}`}>
        {c.back}
      </Link>
      <PageHeader
        eyebrow="RenvoDesk"
        title={c.title}
        description={c.hint}
        action={
          <Button
            onClick={() => {
              setEdit("new");
              setSelected(null);
            }}
          >
            {c.add}
          </Button>
        }
      />
      {edit && (
        <DirectoryEditor
          key={edit === "new" ? "new" : `${edit.id}:${edit.revision}`}
          org={org}
          client={edit === "new" ? undefined : edit}
          done={() => {
            setEdit(null);
            setSelected(null);
            setReload((n) => n + 1);
          }}
          cancel={() => setEdit(null)}
        />
      )}
      <form
        className="estimate-search"
        onSubmit={(e) => {
          e.preventDefault();
          if (loading) return;
          setSearch(query);
          setSelected(null);
          setReload((n) => n + 1);
        }}
      >
        <Input
          aria-label={c.search}
          placeholder={c.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={120}
        />
        <Button variant="outline" disabled={loading}>
          {c.submit}
        </Button>
      </form>
      {loading && <p role="status">{c.loading}</p>}
      {failed ? (
        <div role="alert">
          <p>{c.error}</p>
          <Button onClick={() => setReload((n) => n + 1)}>{c.retry}</Button>
        </div>
      ) : (
        <div className="client-directory-grid">
          <section aria-label={c.title}>
            {rows.map((row) => (
              <article className="task-row" key={row.id}>
                <div className="task-content">
                  <button
                    type="button"
                    className="client-name-button"
                    aria-pressed={selected?.id === row.id}
                    onClick={() => setSelected(row)}
                  >
                    {row.name}
                  </button>
                  <small>
                    {row.kind === "company" ? c.company : c.individual}
                  </small>
                  {row.email && <span>{row.email}</span>}
                  {row.phone && <small>{row.phone}</small>}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEdit(row);
                    setSelected(null);
                  }}
                >
                  {c.edit}
                </Button>
              </article>
            ))}
            {!loading && !rows.length && (
              <p className="workspace-loading">{c.empty}</p>
            )}
            {more && (
              <Button disabled={loading} onClick={loadMore} variant="outline">
                {c.more}
              </Button>
            )}
          </section>
          {selected && (
            <PropertyDirectory key={selected.id} org={org} client={selected} />
          )}
        </div>
      )}
    </AppShell>
  );
}
function PropertyDirectory({ org, client }: { org: string; client: Client }) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  const [rows, setRows] = useState<Property[]>([]),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [more, setMore] = useState(false),
    [reload, setReload] = useState(0),
    [edit, setEdit] = useState<Property | "new" | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload refreshes saved sites
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void listProperties(org, client.id)
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
  }, [org, client.id, reload]);
  async function loadMore() {
    setLoading(true);
    try {
      const data = await listProperties(org, client.id, rows.length);
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
    <section className="client-properties" aria-label={c.properties}>
      <p className="eyebrow">{client.name}</p>
      <div className="section-heading">
        <h2>{c.properties}</h2>
        <Button onClick={() => setEdit("new")}>{c.addProperty}</Button>
      </div>
      {client.billing_address && (
        <p className="helper-text">
          {c.billing_address}: {client.billing_address}
        </p>
      )}
      {edit && (
        <DirectoryEditor
          key={edit === "new" ? "new" : `${edit.id}:${edit.revision}`}
          org={org}
          clientId={client.id}
          property={edit === "new" ? undefined : edit}
          done={() => {
            setEdit(null);
            setReload((n) => n + 1);
          }}
          cancel={() => setEdit(null)}
        />
      )}
      {loading && <p role="status">{c.loading}</p>}
      {failed ? (
        <div role="alert">
          <p>{c.error}</p>
          <Button onClick={() => setReload((n) => n + 1)}>{c.retry}</Button>
        </div>
      ) : (
        <>
          {rows.map((row) => (
            <article className="task-row" key={row.id}>
              <div className="task-content">
                <strong>{row.label}</strong>
                <span>{row.address}</span>
                <small>
                  {row.city} · {row.country}
                </small>
              </div>
              <Button variant="ghost" onClick={() => setEdit(row)}>
                {c.edit}
              </Button>
            </article>
          ))}
          {!loading && !rows.length && <p>{c.noProperties}</p>}
          {more && (
            <Button disabled={loading} variant="outline" onClick={loadMore}>
              {c.more}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
