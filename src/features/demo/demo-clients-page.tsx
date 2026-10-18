import * as Dialog from "@radix-ui/react-dialog";
import { type FormEvent, useRef, useState } from "react";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientCopy } from "@/features/clients/client-copy";
import {
  ClientContactDetails,
  ClientEditorDialog,
  ClientRegisterHeader,
  ClientRegisterSearch,
  ClientRegisterTable,
} from "@/features/clients/client-register";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { type DemoClient, type DemoProperty, say, tx } from "./demo-types";

export function DemoClientsPage() {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  const { clients } = useDemo();
  const editFocus = useRef<HTMLButtonElement | null>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const [kind, setKind] = useState<"" | DemoClient["kind"]>(""),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [edit, setEdit] = useState<DemoClient | "new" | null>(null);
  const selected = clients.find((row) => row.id === selectedId) ?? null;
  const rows = clients.filter(
    (row) =>
      (!kind || row.kind === kind) &&
      row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <div className="connected-workspace clients-register">
      <ClientRegisterHeader
        onAdd={(trigger) => {
          editFocus.current = trigger;
          setEdit("new");
        }}
      />
      {edit && (
        <ClientEditorDialog
          key={edit === "new" ? "new" : edit.id}
          title={edit === "new" ? c.add : c.editTitle}
          busy={false}
          trigger={editFocus.current}
          close={() => setEdit(null)}
        >
          {(cancel) => (
            <ClientEditor
              client={edit === "new" ? undefined : edit}
              cancel={cancel}
              close={() => {
                setEdit(null);
                setKind("");
                setQuery("");
                setSearch("");
              }}
            />
          )}
        </ClientEditorDialog>
      )}
      <ClientRegisterSearch
        kind={kind}
        query={query}
        search={search}
        onKind={setKind}
        onQuery={setQuery}
        onSearch={() => setSearch(query.trim())}
        onReset={() => {
          setKind("");
          setQuery("");
          setSearch("");
        }}
      />
      {rows.length ? (
        <ClientRegisterTable
          rows={rows}
          onOpen={(row, trigger) => {
            returnFocus.current = trigger;
            setSelectedId(row.id);
          }}
          onEdit={(row, trigger) => {
            editFocus.current = trigger;
            setEdit(row);
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
      </div>
      <Dialog.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
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
                  billing={selected.billing}
                />
                <Properties key={selected.id} client={selected} />
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Properties({ client }: { client: DemoClient }) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  const { saveClient } = useDemo();
  const [edit, setEdit] = useState<DemoProperty | "new" | null>(null);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const label = value("label");
    const property: DemoProperty = {
      id: edit === "new" || !edit ? crypto.randomUUID() : edit.id,
      label:
        edit && edit !== "new" && say(edit.label, locale) === label
          ? edit.label
          : tx(label, label),
      address: value("address"),
      city: value("city"),
      country: value("country") as DemoProperty["country"],
    };
    saveClient({
      ...client,
      properties:
        edit === "new"
          ? [...client.properties, property]
          : client.properties.map((p) => (p.id === property.id ? property : p)),
    });
    setEdit(null);
  }
  return (
    <section className="client-properties" aria-label={c.properties}>
      <div className="section-heading">
        <h2>{c.properties}</h2>
        <Button onClick={() => setEdit("new")}>{c.addProperty}</Button>
      </div>
      {edit && (
        <form className="company-form task-editor" onSubmit={submit}>
          <fieldset className="project-fields">
            {(
              [
                [
                  "label",
                  c.label,
                  edit === "new" ? "" : say(edit.label, locale),
                ],
                ["address", c.address, edit === "new" ? "" : edit.address],
                ["city", c.city, edit === "new" ? "" : edit.city],
              ] as const
            ).map(([key, label, value]) => (
              <label
                className="field"
                key={key}
                htmlFor={`demo-property-${key}`}
              >
                {label}
                <Input
                  id={`demo-property-${key}`}
                  name={key}
                  defaultValue={value}
                  required
                  maxLength={200}
                />
              </label>
            ))}
            <label className="field" htmlFor="demo-property-country">
              {c.country}
              <select
                className="input"
                id="demo-property-country"
                name="country"
                defaultValue={edit === "new" ? "BE" : edit.country}
              >
                <option value="BE">BE</option>
                <option value="FR">FR</option>
                <option value="NL">NL</option>
              </select>
            </label>
            <div className="dialog-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEdit(null)}
              >
                {c.cancel}
              </Button>
              <Button>{c.saveProperty}</Button>
            </div>
          </fieldset>
        </form>
      )}
      {client.properties.map((row) => (
        <article className="task-row" key={row.id}>
          <div className="task-content">
            <strong>{say(row.label, locale)}</strong>
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
      {!client.properties.length && <p>{c.noProperties}</p>}
    </section>
  );
}

function ClientEditor({
  client,
  close,
  cancel,
}: {
  client?: DemoClient;
  close: () => void;
  cancel: () => void;
}) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  const { saveClient } = useDemo();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    saveClient({
      id: client?.id ?? crypto.randomUUID(),
      name: value("name"),
      kind: value("kind") as DemoClient["kind"],
      email: value("email"),
      phone: value("phone"),
      billing: value("billing"),
      properties: client?.properties ?? [],
    });
    close();
  }
  return (
    <form className="company-form task-editor" onSubmit={submit}>
      <fieldset className="project-fields">
        <label className="field" htmlFor="demo-client-name">
          {c.name}
          <Input
            id="demo-client-name"
            name="name"
            required
            maxLength={120}
            defaultValue={client?.name}
          />
        </label>
        <label className="field" htmlFor="demo-client-kind">
          {c.kind}
          <select
            className="input"
            id="demo-client-kind"
            name="kind"
            defaultValue={client?.kind ?? "individual"}
          >
            <option value="individual">{c.individual}</option>
            <option value="company">{c.company}</option>
          </select>
        </label>
        <label className="field" htmlFor="demo-client-email">
          {c.email}
          <Input
            id="demo-client-email"
            name="email"
            type="email"
            maxLength={254}
            defaultValue={client?.email}
          />
        </label>
        <label className="field" htmlFor="demo-client-phone">
          {c.phone}
          <Input
            type="tel"
            id="demo-client-phone"
            name="phone"
            maxLength={50}
            defaultValue={client?.phone}
          />
        </label>
        <label
          className="field client-billing-field"
          htmlFor="demo-client-billing"
        >
          {c.billing_address}
          <Input
            id="demo-client-billing"
            name="billing"
            maxLength={300}
            defaultValue={client?.billing}
          />
        </label>
        <div className="dialog-actions">
          <Button type="button" variant="outline" onClick={cancel}>
            {c.cancel}
          </Button>
          <Button>{c.save}</Button>
        </div>
      </fieldset>
    </form>
  );
}
