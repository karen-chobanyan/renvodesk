import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { teamCopy } from "./team-copy";

export type DirectoryMember = {
  id: string;
  email: string;
  name?: string;
  role: string;
};
export type DirectoryInvitation = {
  id: string;
  email: string;
  state: "pending" | "accepted" | "revoked" | "expired";
  expires: string;
};
export function TeamHeader({
  invite,
  refresh,
  loading,
}: {
  invite: (button: HTMLButtonElement) => void;
  refresh?: () => void;
  loading?: boolean;
}) {
  const { locale } = useLocale(),
    c = teamCopy[locale];
  return (
    <>
      <header className="project-register-header">
        <div>
          <h1 className="register-title">{c.title}</h1>
          <p className="page-description">{c.directoryHint}</p>
        </div>
        <div className="team-header-actions">
          {refresh && (
            <Button variant="outline" disabled={loading} onClick={refresh}>
              {c.refresh}
            </Button>
          )}
          <Button id="team-invite" onClick={(e) => invite(e.currentTarget)}>
            <Plus size={16} aria-hidden="true" />
            {c.invite}
          </Button>
        </div>
      </header>
      <details className="team-permissions">
        <summary>{c.permissionsTitle}</summary>
        <p>{c.permission}</p>
      </details>
    </>
  );
}
export function TeamMembers({
  rows,
  loading,
  failed,
  retry,
  more,
  busy,
  remove,
}: {
  rows: DirectoryMember[];
  loading?: boolean;
  failed?: boolean;
  retry?: () => void;
  more?: () => void;
  busy?: boolean;
  remove: (row: DirectoryMember, trigger: HTMLButtonElement) => void;
}) {
  const { locale } = useLocale(),
    c = teamCopy[locale];
  return (
    <section
      className="team-section"
      aria-label={c.members}
      aria-busy={loading}
    >
      <div className="team-section-heading">
        <h2>{c.members}</h2>
        <span className="helper-text">
          {c.loaded}: {rows.length}
        </span>
      </div>
      {loading && <p role="status">{c.loading}</p>}
      {failed && (
        <div role="alert" className="register-error">
          <p>{c.error}</p>
          <Button variant="outline" disabled={loading} onClick={retry}>
            {c.retry}
          </Button>
        </div>
      )}
      {!loading && !failed && !rows.length && (
        <p className="team-empty">{c.noMembers}</p>
      )}
      {rows.map((row) => (
        <article className="team-row" key={row.id}>
          <div className="team-person">
            <strong>{row.name ?? row.email}</strong>
            {row.name && <span>{row.email}</span>}
          </div>
          <span className={`status team-role-${row.role}`}>
            {row.role === "owner" ? c.owner : c.member}
          </span>
          {row.role === "member" && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={(event) => remove(row, event.currentTarget)}
            >
              {c.remove}
            </Button>
          )}
        </article>
      ))}
      {more && (
        <Button
          className="team-more"
          variant="outline"
          disabled={loading || busy}
          onClick={more}
        >
          {c.more}
        </Button>
      )}
    </section>
  );
}
export function TeamInvitations({
  rows,
  loading,
  failed,
  retry,
  more,
  busy,
  showLink,
  revoke,
}: {
  rows: DirectoryInvitation[];
  loading?: boolean;
  failed?: boolean;
  retry?: () => void;
  more?: () => void;
  busy?: boolean;
  showLink: (row: DirectoryInvitation, button: HTMLButtonElement) => void;
  revoke: (row: DirectoryInvitation) => void;
}) {
  const { locale } = useLocale(),
    c = teamCopy[locale];
  const pending = rows.filter((i) => i.state === "pending"),
    history = rows.filter((i) => i.state !== "pending");
  function row(i: DirectoryInvitation) {
    return (
      <article className="team-row" key={i.id}>
        <div className="team-person">
          <strong>{i.email}</strong>
          <small>
            {i.state === "expired" ? c.expiredOn : c.expires}:{" "}
            {new Intl.DateTimeFormat(locale === "fr" ? "fr-BE" : "en-GB", {
              dateStyle: "medium",
            }).format(new Date(i.expires))}
          </small>
        </div>
        <span className={`status team-invitation-${i.state}`}>
          {c[i.state]}
        </span>
        {i.state === "pending" && (
          <div className="team-row-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={(e) => showLink(i, e.currentTarget)}
            >
              {c.link}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => revoke(i)}>
              {c.revoke}
            </Button>
          </div>
        )}
      </article>
    );
  }
  return (
    <section
      className="team-section"
      aria-label={c.invitations}
      aria-busy={loading}
    >
      <div className="team-section-heading">
        <h2>{c.invitations}</h2>
        <span className="helper-text">
          {c.loaded}: {rows.length}
        </span>
      </div>
      {loading && <p role="status">{c.loading}</p>}
      {failed && (
        <div role="alert" className="register-error">
          <p>{c.error}</p>
          <Button variant="outline" disabled={loading} onClick={retry}>
            {c.retry}
          </Button>
        </div>
      )}
      <h3>{c.pending}</h3>
      {pending.map(row)}
      {!loading && !failed && !pending.length && (
        <p className="team-empty">{c.noPending}</p>
      )}
      {history.length > 0 && (
        <details className="team-history">
          <summary>
            {c.invitationHistory} ({history.length})
          </summary>
          {history.map(row)}
        </details>
      )}
      {more && (
        <Button
          className="team-more"
          variant="outline"
          disabled={loading || busy}
          onClick={more}
        >
          {c.more}
        </Button>
      )}
    </section>
  );
}
export function TeamInvitationDialog({
  initial,
  trigger,
  close,
  create,
  demoNotice,
}: {
  initial?: { email: string; link: string };
  trigger: HTMLButtonElement | null;
  close: () => void;
  create: (email: string, request: string) => Promise<string>;
  demoNotice?: string;
}) {
  const { locale } = useLocale(),
    c = teamCopy[locale];
  const [email, setEmail] = useState(initial?.email ?? ""),
    [link, setLink] = useState(initial?.link ?? "");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [copied, setCopied] = useState(false),
    [copyFailed, setCopyFailed] = useState(false);
  const request = useRef<{ id: string; email: string } | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (link) linkInput.current?.focus();
  }, [link]);
  function cancel() {
    if (busy) return;
    if (
      !link &&
      (email || request.current) &&
      !window.confirm(request.current ? c.unconfirmedClose : c.discard)
    )
      return;
    close();
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || link || !email.trim()) return;
    request.current ??= { id: crypto.randomUUID(), email: email.trim() };
    setBusy(true);
    setError(false);
    try {
      setLink(await create(request.current.email, request.current.id));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
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
          className="dialog-content team-invite-dialog"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (trigger?.isConnected) trigger.focus();
            else document.getElementById("team-invite")?.focus();
          }}
        >
          <Dialog.Title className="dialog-title">
            {link ? c.link : c.invite}
          </Dialog.Title>
          <Dialog.Description className="muted">
            {c.transport}
          </Dialog.Description>
          {link ? (
            <div className="team-invite-result">
              <p>{email}</p>
              <label className="field" htmlFor="team-link">
                {c.link}
                <Input
                  ref={linkInput}
                  id="team-link"
                  value={link}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
              </label>
              {demoNotice && <p className="helper-text">{demoNotice}</p>}
              <div className="dialog-actions">
                <Button variant="outline" onClick={cancel}>
                  {c.close}
                </Button>
                <Button
                  onClick={async () => {
                    setCopyFailed(false);
                    try {
                      await navigator.clipboard.writeText(link);
                      setCopied(true);
                    } catch {
                      setCopyFailed(true);
                      linkInput.current?.focus();
                    }
                  }}
                >
                  {copied ? c.copied : c.copy}
                </Button>
              </div>
              {copied && <p role="status">{c.copied}</p>}
              {copyFailed && <p role="alert">{c.copyFailed}</p>}
            </div>
          ) : (
            <form className="team-invite-form" onSubmit={submit}>
              <label className="field" htmlFor="team-email">
                {c.email}
                <Input
                  id="team-email"
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  readOnly={!!request.current}
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              {error && (
                <p role="alert" className="error-message">
                  {c.failed}
                </p>
              )}
              {error && <p className="helper-text">{c.retryHint}</p>}
              <div className="dialog-actions">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={cancel}
                >
                  {c.cancel}
                </Button>
                <Button disabled={busy || !email.trim()}>
                  {busy ? c.loading : c.create}
                </Button>
              </div>
            </form>
          )}
          <button
            type="button"
            className="dialog-close button button-ghost button-icon"
            disabled={busy}
            aria-label={c.close}
            onClick={cancel}
          >
            <X size={18} />
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
