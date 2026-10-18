import * as Dialog from "@radix-ui/react-dialog";
import { Mail, Phone, Plus, Search, X } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { clientCopy } from "./client-copy";

export function ClientRegisterHeader({
  onAdd,
}: {
  onAdd: (trigger: HTMLButtonElement) => void;
}) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  return (
    <header className="project-register-header">
      <div>
        <h1 className="register-title">{c.title}</h1>
        <p className="page-description">{c.hint}</p>
      </div>
      <Button id="client-add" onClick={(event) => onAdd(event.currentTarget)}>
        <Plus size={16} />
        {c.add}
      </Button>
    </header>
  );
}

export type ClientKindFilter = "" | "individual" | "company";
export function ClientRegisterSearch({
  kind,
  query,
  search,
  loading = false,
  onKind,
  onQuery,
  onSearch,
  onReset,
}: {
  kind: ClientKindFilter;
  query: string;
  search: string;
  loading?: boolean;
  onKind: (value: ClientKindFilter) => void;
  onQuery: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
}) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <fieldset className="section-tabs register-status" aria-label={c.kind}>
        {(["", "individual", "company"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={kind === value ? "selected" : ""}
            aria-pressed={kind === value}
            onClick={() => onKind(value)}
          >
            {value ? c[value] : c.all}
          </button>
        ))}
      </fieldset>
      <form
        className="register-toolbar client-search"
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading) onSearch();
        }}
      >
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <Input
            ref={input}
            aria-label={c.search}
            placeholder={c.search}
            value={query}
            maxLength={120}
            onChange={(event) => onQuery(event.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" disabled={loading}>
          {c.submit}
        </Button>
        {(query || search || kind) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onReset();
              input.current?.focus();
            }}
          >
            {c.reset}
          </Button>
        )}
      </form>
      {query.trim() !== search.trim() && (
        <p className="register-scope" role="status">
          {c.searchPending}
        </p>
      )}
    </>
  );
}

type ClientRow = {
  id: string;
  name: string;
  kind: string;
  email: string | null;
  phone: string | null;
};
export function ClientRegisterTable<T extends ClientRow>({
  rows,
  onOpen,
  onEdit,
}: {
  rows: T[];
  onOpen: (row: T, trigger: HTMLButtonElement) => void;
  onEdit: (row: T, trigger: HTMLButtonElement) => void;
}) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  return (
    <div className="table-scroll">
      <table className="project-table client-table">
        <caption className="sr-only">{c.title}</caption>
        <thead>
          <tr>
            <th scope="col">{c.clientLabel}</th>
            <th scope="col">{c.kind}</th>
            <th scope="col">{c.contact}</th>
            <th scope="col">
              <span className="sr-only">{c.edit}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="client-identity">
                <button
                  className="project-link client-open-button"
                  type="button"
                  aria-haspopup="dialog"
                  onClick={(event) => onOpen(row, event.currentTarget)}
                >
                  <span className="project-thumbnail sage" aria-hidden="true">
                    {row.name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toLocaleUpperCase(locale)}
                  </span>
                  <strong>{row.name}</strong>
                </button>
              </td>
              <td className="client-kind">
                <span className="status">
                  {row.kind === "company" ? c.company : c.individual}
                </span>
              </td>
              <td className="client-contacts">
                <div>
                  {row.email && (
                    <a href={`mailto:${row.email}`}>
                      <Mail size={14} aria-hidden="true" />
                      <span>{row.email}</span>
                    </a>
                  )}
                  {row.phone && (
                    <a href={`tel:${row.phone}`}>
                      <Phone size={14} aria-hidden="true" />
                      <span>{row.phone}</span>
                    </a>
                  )}
                  {!row.email && !row.phone && (
                    <span className="muted">{c.noContact}</span>
                  )}
                </div>
              </td>
              <td className="client-edit">
                <Button
                  variant="ghost"
                  aria-label={`${c.edit} — ${row.name}`}
                  onClick={(event) => onEdit(row, event.currentTarget)}
                >
                  {c.edit}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ClientEditorDialog({
  title,
  busy,
  trigger,
  close,
  children,
}: {
  title: string;
  busy: boolean;
  trigger: HTMLButtonElement | null;
  close: () => void;
  children: (cancel: () => void) => ReactNode;
}) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  const [dirty, setDirty] = useState(false);
  function cancel() {
    if (!busy && (!dirty || window.confirm(c.discard))) close();
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content client-editor-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (trigger?.isConnected) trigger.focus();
            else document.getElementById("client-add")?.focus();
          }}
        >
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
          <Dialog.Description className="muted">
            {c.editorHint}
          </Dialog.Description>
          <div onChangeCapture={() => setDirty(true)}>{children(cancel)}</div>
          <button
            type="button"
            className="dialog-close button button-ghost button-icon"
            aria-label={c.close}
            disabled={busy}
            onClick={cancel}
          >
            <X size={18} />
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ClientContactDetails({
  kind,
  email,
  phone,
  billing,
}: {
  kind: string;
  email: string | null;
  phone: string | null;
  billing: string | null;
}) {
  const { locale } = useLocale(),
    c = clientCopy[locale];
  return (
    <div className="client-drawer-contact">
      <span className="status">
        {kind === "company" ? c.company : c.individual}
      </span>
      {email && (
        <a className="client-contact" href={`mailto:${email}`}>
          <Mail size={15} aria-hidden="true" />
          {email}
        </a>
      )}
      {phone && (
        <a className="client-contact" href={`tel:${phone}`}>
          <Phone size={15} aria-hidden="true" />
          {phone}
        </a>
      )}
      {billing && (
        <div className="client-billing">
          <h3>{c.billing_address}</h3>
          <p>{billing}</p>
        </div>
      )}
    </div>
  );
}
