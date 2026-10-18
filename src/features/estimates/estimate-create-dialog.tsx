import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { draftCopy } from "./draft-copy";
import { registerCopy } from "./register-copy";

export type EstimateProjectOption = {
  id: string;
  name: string;
  client: string;
};
export function EstimateCreateDialog({
  projects,
  loading = false,
  failed = false,
  more = false,
  onMore,
  onRetry,
  projectsHref,
  trigger,
  close,
  create,
  fixedProject,
}: {
  projects: EstimateProjectOption[];
  fixedProject?: EstimateProjectOption;
  loading?: boolean;
  failed?: boolean;
  more?: boolean;
  onMore?: () => void;
  onRetry?: () => void;
  projectsHref: string;
  trigger: HTMLButtonElement | null;
  close: () => void;
  create: (project: string, title: string, id: string) => Promise<void>;
}) {
  const { locale } = useLocale(),
    c = registerCopy[locale],
    d = draftCopy[locale];
  const [project, setProject] = useState(fixedProject?.id ?? "");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  // A failed response may hide a committed insert: retries reuse both identity and fields.
  const request = useRef<{ id: string; project: string; title: string } | null>(
    null,
  );
  function cancel() {
    if (busy) return;
    const message = request.current
      ? c.unconfirmedClose
      : (!fixedProject && project) || title
        ? c.discard
        : "";
    if (!message || window.confirm(message)) close();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !project || !title.trim()) return;
    request.current ??= {
      id: crypto.randomUUID(),
      project,
      title: title.trim(),
    };
    setBusy(true);
    setError(false);
    try {
      await create(
        request.current.project,
        request.current.title,
        request.current.id,
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  const locked = busy || !!request.current;
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
          className="dialog-content estimate-create-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (trigger?.isConnected) trigger.focus();
            else document.getElementById("estimate-new")?.focus();
          }}
        >
          <Dialog.Title className="dialog-title">{d.new}</Dialog.Title>
          <Dialog.Description className="muted">
            {fixedProject
              ? locale === "fr"
                ? "Nommez votre devis. Vous ajouterez les lignes dans le brouillon."
                : "Name your estimate. You can add lines in the draft."
              : c.createHint}
          </Dialog.Description>
          <form className="estimate-create-form" onSubmit={submit}>
            {fixedProject ? (
              <p className="helper-text">
                {fixedProject.name} · {fixedProject.client}
              </p>
            ) : (
              <>
                <label className="field" htmlFor="estimate-project">
                  {c.chooseProject}
                  <select
                    id="estimate-project"
                    className="input"
                    required
                    value={project}
                    disabled={locked || !projects.length}
                    onChange={(e) => setProject(e.target.value)}
                  >
                    <option value="">{c.choosePlaceholder}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.client}
                      </option>
                    ))}
                  </select>
                </label>
                {projects.length > 0 && (
                  <p className="helper-text">
                    {c.projectsLoaded}: {projects.length}
                  </p>
                )}
                {loading && <p role="status">{d.loading}</p>}
                {failed && (
                  <div role="alert">
                    <p>{c.projectsError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onRetry}
                      disabled={loading || locked}
                    >
                      {d.retry}
                    </Button>
                  </div>
                )}
                {more && !failed && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onMore}
                    disabled={loading || locked}
                  >
                    {c.moreProjects}
                  </Button>
                )}
                {!loading && !failed && !projects.length && (
                  <div className="estimate-project-empty">
                    <p>{c.noProjects}</p>
                    <Link className="account-link" to={projectsHref}>
                      {c.viewProjects}
                    </Link>
                  </div>
                )}
              </>
            )}
            <label className="field" htmlFor="estimate-title">
              {d.title}
              <Input
                id="estimate-title"
                required
                maxLength={120}
                value={title}
                disabled={locked}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="error-message">
                {d.createError}
              </p>
            )}
            <div className="dialog-actions">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={cancel}
              >
                {c.cancel}
              </Button>
              <Button disabled={busy || !project || !title.trim()}>
                {busy ? d.loading : error ? d.retry : d.create}
              </Button>
            </div>
          </form>
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
