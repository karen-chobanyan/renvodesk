import * as Dialog from "@radix-ui/react-dialog";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useWorkspaceRouteState,
  workspaceKeys,
} from "@/features/organizations/workspace-context";
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
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const queryClient = useQueryClient();
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const [kind, setKind] = useWorkspaceRouteState<"" | "individual" | "company">(
    `clients:${org}:kind`,
    "",
  );
  const [query, setQuery] = useWorkspaceRouteState(`clients:${org}:query`, "");
  const [search, setSearch] = useWorkspaceRouteState(
    `clients:${org}:search`,
    "",
  );
  const [edit, setEdit] = useState<Client | "new" | null>(null),
    [selected, setSelected] = useState<Client | null>(null);
  const clientQuery = useInfiniteQuery({
    queryKey: workspaceKeys.clients(userId, org, kind, search),
    queryFn: ({ pageParam }) =>
      listClients(org, search, pageParam, kind || undefined),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length * 20 : undefined,
    enabled: !!userId && !!org,
  });
  const rows: Client[] = Array.from(
    new Map(
      clientQuery.data?.pages.flat().map((row) => [row.id, row]) ?? [],
    ).values(),
  );
  const loading = clientQuery.isPending && clientQuery.isFetching;
  const failed = clientQuery.isError && !clientQuery.data;
  const more = clientQuery.hasNextPage;
  return (
    <div className="connected-workspace clients-register">
      <Link className="back-link" to={`/workspace?company=${org}`}>
        {c.back}
      </Link>
      <PageHeader
        eyebrow={locale === "fr" ? "Carnet d’adresses" : "Address book"}
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
            void queryClient.invalidateQueries({
              queryKey: ["workspace", userId, org, "clients"],
            });
          }}
          cancel={() => setEdit(null)}
        />
      )}
      <fieldset
        className="section-tabs"
        aria-label={locale === "fr" ? "Type de client" : "Client type"}
      >
        {(["", "individual", "company"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={kind === value ? "selected" : ""}
            aria-pressed={kind === value}
            onClick={() => {
              setKind(value);
              setSelected(null);
            }}
          >
            {value === ""
              ? locale === "fr"
                ? "Tous les clients"
                : "All clients"
              : value === "company"
                ? c.company
                : c.individual}
          </button>
        ))}
      </fieldset>
      <form
        className="table-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          if (loading) return;
          setSearch(query);
          setSelected(null);
          if (search === query) void clientQuery.refetch();
        }}
      >
        <div className="search-field">
          <Search size={17} />
          <Input
            aria-label={c.search}
            placeholder={c.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={120}
          />
        </div>
        <Button variant="outline" disabled={loading}>
          {c.submit}
        </Button>
      </form>
      {loading && <p role="status">{c.loading}</p>}
      {clientQuery.isError && clientQuery.data && <p role="alert">{c.error}</p>}
      {failed ? (
        <div role="alert">
          <p>{c.error}</p>
          <Button onClick={() => void clientQuery.refetch()}>{c.retry}</Button>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="project-table">
            <caption className="sr-only">{c.title}</caption>
            <thead>
              <tr>
                <th scope="col">{locale === "fr" ? "Client" : "Client"}</th>
                <th scope="col">Type</th>
                <th scope="col" className="client-secondary">
                  Email
                </th>
                <th scope="col" className="client-secondary">
                  {locale === "fr" ? "Téléphone" : "Phone"}
                </th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button
                      className="project-link client-open-button"
                      type="button"
                      aria-haspopup="dialog"
                      onClick={(event) => {
                        returnFocus.current = event.currentTarget;
                        setSelected(row);
                      }}
                    >
                      <span
                        className="project-thumbnail sage"
                        aria-hidden="true"
                      >
                        {row.name
                          .trim()
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span>
                        <strong>{row.name}</strong>
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className="status">
                      {row.kind === "company" ? c.company : c.individual}
                    </span>
                  </td>
                  <td className="client-secondary">
                    {row.email ? (
                      <a href={`mailto:${row.email}`}>{row.email}</a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="client-secondary">
                    {row.phone ? (
                      <a href={`tel:${row.phone}`}>{row.phone}</a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEdit(row);
                        setSelected(null);
                      }}
                    >
                      {c.edit}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !rows.length && (
            <p className="workspace-loading">{c.empty}</p>
          )}
          {more && (
            <Button
              disabled={clientQuery.isFetchingNextPage}
              onClick={() => void clientQuery.fetchNextPage()}
              variant="outline"
            >
              {c.more}
            </Button>
          )}
        </div>
      )}
      <Dialog.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="client-drawer"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              returnFocus.current?.focus();
            }}
          >
            <Dialog.Title className="dialog-title">
              {selected?.name}
            </Dialog.Title>
            <Dialog.Description className="helper-text">
              {c.hint}
            </Dialog.Description>
            <Dialog.Close className="button button-outline client-drawer-close">
              {locale === "fr" ? "Fermer" : "Close"}
            </Dialog.Close>
            {selected && (
              <>
                <div className="client-drawer-contact">
                  <span className="status">
                    {selected.kind === "company" ? c.company : c.individual}
                  </span>
                  {selected.email && (
                    <a
                      className="client-contact"
                      href={`mailto:${selected.email}`}
                    >
                      {selected.email}
                    </a>
                  )}
                  {selected.phone && (
                    <a
                      className="client-contact"
                      href={`tel:${selected.phone}`}
                    >
                      {selected.phone}
                    </a>
                  )}
                </div>
                <PropertyDirectory
                  key={selected.id}
                  org={org}
                  client={selected}
                />
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
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
