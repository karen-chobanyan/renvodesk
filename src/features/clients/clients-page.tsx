import * as Dialog from "@radix-ui/react-dialog";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useWorkspaceRouteState,
  workspaceKeys,
} from "@/features/organizations/workspace-context";
import { useLocale } from "@/lib/i18n";
import { clientCopy } from "./client-copy";
import {
  ClientContactDetails,
  ClientEditorDialog,
  ClientRegisterHeader,
  ClientRegisterSearch,
  ClientRegisterTable,
} from "./client-register";
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
  const editFocus = useRef<HTMLButtonElement | null>(null);
  const [saving, setSaving] = useState(false);
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
      <ClientRegisterHeader
        onAdd={(trigger) => {
          editFocus.current = trigger;
          setSaving(false);
          setEdit("new");
          setSelected(null);
        }}
      />
      {edit && (
        <ClientEditorDialog
          key={edit === "new" ? "new" : edit.id}
          title={edit === "new" ? c.add : c.editTitle}
          busy={saving}
          trigger={editFocus.current}
          close={() => setEdit(null)}
        >
          {(cancel) => (
            <DirectoryEditor
              org={org}
              client={edit === "new" ? undefined : edit}
              onBusyChange={setSaving}
              done={() => {
                setEdit(null);
                setSelected(null);
                setKind("");
                setQuery("");
                setSearch("");
                void queryClient.invalidateQueries({
                  queryKey: ["workspace", userId, org, "clients"],
                });
              }}
              cancel={cancel}
            />
          )}
        </ClientEditorDialog>
      )}
      <ClientRegisterSearch
        kind={kind}
        query={query}
        search={search}
        loading={loading}
        onKind={(value) => {
          setKind(value);
          setSelected(null);
        }}
        onQuery={setQuery}
        onSearch={() => {
          setSearch(query.trim());
          setSelected(null);
          if (search === query.trim()) void clientQuery.refetch();
        }}
        onReset={() => {
          setKind("");
          setQuery("");
          setSearch("");
          setSelected(null);
        }}
      />
      {loading && (
        <p role="status" className="register-message">
          {c.loading}
        </p>
      )}
      {clientQuery.isError && clientQuery.data && (
        <div className="register-message">
          <p role="alert">{c.error}</p>
          <Button variant="outline" onClick={() => void clientQuery.refetch()}>
            {c.retry}
          </Button>
        </div>
      )}
      {failed ? (
        <div className="register-message">
          <p role="alert">{c.error}</p>
          <Button variant="outline" onClick={() => void clientQuery.refetch()}>
            {c.retry}
          </Button>
        </div>
      ) : (
        !loading && (
          <>
            {rows.length ? (
              <ClientRegisterTable
                rows={rows}
                onOpen={(row, trigger) => {
                  returnFocus.current = trigger;
                  setSelected(row);
                }}
                onEdit={(row, trigger) => {
                  editFocus.current = trigger;
                  setSaving(false);
                  setEdit(row);
                  setSelected(null);
                }}
              />
            ) : (
              <EmptyState
                title={search || kind ? c.empty : c.emptyTitle}
                description={search || kind ? c.noResultsHint : c.emptyHint}
              />
            )}
            <div className="register-footer">
              <p role="status">
                {rows.length} {c.loaded}
              </p>
              {more && (
                <Button
                  disabled={clientQuery.isFetchingNextPage}
                  onClick={() => void clientQuery.fetchNextPage()}
                  variant="outline"
                >
                  {clientQuery.isFetchingNextPage ? c.loading : c.more}
                </Button>
              )}
            </div>
          </>
        )
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
              {c.detailHint}
            </Dialog.Description>
            <Dialog.Close className="button button-outline client-drawer-close">
              {locale === "fr" ? "Fermer" : "Close"}
            </Dialog.Close>
            {selected && (
              <>
                <ClientContactDetails
                  kind={selected.kind}
                  email={selected.email}
                  phone={selected.phone}
                  billing={selected.billing_address}
                />
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
      <div className="section-heading">
        <h2>{c.properties}</h2>
        <Button onClick={() => setEdit("new")}>{c.addProperty}</Button>
      </div>
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
