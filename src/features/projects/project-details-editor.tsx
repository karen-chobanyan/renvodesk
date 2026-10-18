import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { projectCopy } from "./project-copy";
import { projectDetailCopy } from "./project-detail-copy";
import type { ProjectInput } from "./project-service";

type EditableProject = ProjectInput & { status: string; revision: number };
const fields = ["name", "client_name", "city", "address"] as const;
function values(record: EditableProject) {
  return {
    name: record.name,
    client_name: record.client_name,
    city: record.city,
    address: record.address ?? "",
    status: record.status,
  };
}
export function ProjectDetailsEditor<T extends EditableProject>({
  initial,
  save,
  reload,
  close,
}: {
  initial: T;
  save: (
    base: T,
    input: ProjectInput & { status: string },
  ) => Promise<T | null>;
  reload?: () => Promise<T | null>;
  close: () => void;
}) {
  const { locale, t } = useLocale(),
    c = projectDetailCopy[locale],
    labels = projectCopy[locale];
  // This snapshot belongs to the open editor, never to a background query refresh.
  const [base, setBase] = useState(initial),
    [draft, setDraft] = useState(() => values(initial));
  const [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const [error, setError] = useState<
    "failed" | "conflict" | "reloadFailed" | null
  >(null);
  const [conflict, setConflict] = useState(false);
  const [invalid, setInvalid] = useState<(typeof fields)[number] | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(values(base));
  useUnsavedChangesGuard(dirty || busy, c.leave);
  function cancel() {
    if (!busy && (!dirty || window.confirm(c.leave))) close();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !dirty || conflict) return;
    const input = { ...draft };
    for (const field of fields) {
      input[field] = input[field].trim();
      if (
        (field !== "address" && !input[field]) ||
        input[field].length > (field === "address" ? 300 : 120) ||
        [...input[field]].some(
          (character) =>
            character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
        )
      ) {
        setInvalid(field);
        requestAnimationFrame(() =>
          form.current
            ?.querySelector<HTMLInputElement>(`#project-${field}`)
            ?.focus(),
        );
        return;
      }
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await save(base, input);
      if (!result) {
        setConflict(true);
        setError("conflict");
      } else {
        setBase(result);
        setDraft(values(result));
        setSaved(true);
      }
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }
  async function replace() {
    if (!reload || busy || (dirty && !window.confirm(c.replace))) return;
    setBusy(true);
    try {
      const result = await reload();
      if (!result) throw new Error("missing");
      setBase(result);
      setDraft(values(result));
      setError(null);
      setConflict(false);
      setInvalid(null);
      setSaved(false);
    } catch {
      setError("reloadFailed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      <DialogContent
        title={c.title}
        description={c.hint}
        closeLabel={t("close")}
      >
        <form
          ref={form}
          id="site-details"
          className="project-details-form"
          noValidate
          onSubmit={submit}
        >
          <fieldset disabled={busy} className="project-fields">
            {fields.map((field) => (
              <div className="field" key={field}>
                <label htmlFor={`project-${field}`}>
                  {labels[field === "client_name" ? "client" : field]}
                </label>
                <Input
                  id={`project-${field}`}
                  name={field === "name" ? "project_name" : field}
                  value={draft[field]}
                  required={field !== "address"}
                  maxLength={field === "address" ? 300 : 120}
                  aria-invalid={invalid === field}
                  aria-describedby={
                    invalid === field ? "project-field-error" : undefined
                  }
                  onChange={(e) => {
                    setDraft({ ...draft, [field]: e.target.value });
                    setSaved(false);
                    setInvalid(null);
                    if (!conflict) setError(null);
                  }}
                />
                {invalid === field && (
                  <span
                    className="error-message"
                    id="project-field-error"
                    role="alert"
                  >
                    {field === "address" ? c.addressInvalid : c.invalid}
                  </span>
                )}
              </div>
            ))}
            <div className="field">
              <label htmlFor="project-status">{c.status}</label>
              <select
                className="input"
                id="project-status"
                name="status"
                value={draft.status}
                onChange={(e) => {
                  setDraft({ ...draft, status: e.target.value });
                  setSaved(false);
                  if (!conflict) setError(null);
                }}
              >
                {(["planning", "active", "completed"] as const).map(
                  (status) => (
                    <option key={status} value={status}>
                      {t(status)}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="dialog-actions">
              <Button type="button" variant="outline" onClick={cancel}>
                {c.cancel}
              </Button>
              <Button type="submit" disabled={!dirty || conflict}>
                {busy ? c.loading : c.save}
              </Button>
            </div>
          </fieldset>
          <p className="helper-text" role="status">
            {busy ? c.loading : dirty ? c.unsaved : saved ? c.saved : ""}
          </p>
          {error && (
            <div role="alert">
              <p className="error-message">{c[error]}</p>
              {reload && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={replace}
                >
                  {c.reload}
                </Button>
              )}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
