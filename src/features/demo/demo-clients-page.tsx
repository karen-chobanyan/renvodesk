import * as Dialog from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientCopy } from "@/features/clients/client-copy";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { type DemoClient, type DemoProperty, say, tx } from "./demo-types";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export function DemoClientsPage() {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  const { clients } = useDemo();
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
      <Link className="back-link" to="/projects">
        {c.back}
      </Link>
      <PageHeader
        eyebrow={locale === "fr" ? "Carnet d’adresses" : "Address book"}
        title={c.title}
        description={c.hint}
        action={<Button onClick={() => setEdit("new")}>{c.add}</Button>}
      />
      {edit && (
        <ClientEditor
          key={edit === "new" ? "new" : edit.id}
          client={edit === "new" ? undefined : edit}
          close={() => setEdit(null)}
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
            onClick={() => setKind(value)}
          >
            {value === ""
              ? locale === "fr"
                ? "Tous les clients"
                : "All clients"
              : c[value]}
          </button>
        ))}
      </fieldset>
      <form
        className="table-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query);
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
        <Button variant="outline">{c.submit}</Button>
      </form>
      <div className="table-scroll">
        <table className="project-table">
          <caption className="sr-only">{c.title}</caption>
          <thead>
            <tr>
              <th scope="col">Client</th>
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
                    onClick={() => setSelectedId(row.id)}
                  >
                    <span className="project-thumbnail sage" aria-hidden="true">
                      {initials(row.name)}
                    </span>
                    <span>
                      <strong>{row.name}</strong>
                    </span>
                  </button>
                </td>
                <td>
                  <span className="status">{c[row.kind]}</span>
                </td>
                <td className="client-secondary">
                  <a href={`mailto:${row.email}`}>{row.email}</a>
                </td>
                <td className="client-secondary">
                  <a href={`tel:${row.phone}`}>{row.phone}</a>
                </td>
                <td>
                  <Button variant="ghost" onClick={() => setEdit(row)}>
                    {c.edit}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="workspace-loading">{c.empty}</p>}
      </div>
      <Dialog.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="client-drawer">
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
                  <span className="status">{c[selected.kind]}</span>
                  <a
                    className="client-contact"
                    href={`mailto:${selected.email}`}
                  >
                    {selected.email}
                  </a>
                  <a className="client-contact" href={`tel:${selected.phone}`}>
                    {selected.phone}
                  </a>
                </div>
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
      <p className="eyebrow">{client.name}</p>
      <div className="section-heading">
        <h2>{c.properties}</h2>
        <Button onClick={() => setEdit("new")}>{c.addProperty}</Button>
      </div>
      {client.billing && (
        <p className="helper-text">
          {c.billing_address}: {client.billing}
        </p>
      )}
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
}: {
  client?: DemoClient;
  close: () => void;
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
            id="demo-client-phone"
            name="phone"
            maxLength={50}
            defaultValue={client?.phone}
          />
        </label>
        <label className="field" htmlFor="demo-client-billing">
          {c.billing_address}
          <Input
            id="demo-client-billing"
            name="billing"
            maxLength={300}
            defaultValue={client?.billing}
          />
        </label>
        <div className="dialog-actions">
          <Button type="button" variant="outline" onClick={close}>
            {c.cancel}
          </Button>
          <Button>{c.save}</Button>
        </div>
      </fieldset>
    </form>
  );
}
