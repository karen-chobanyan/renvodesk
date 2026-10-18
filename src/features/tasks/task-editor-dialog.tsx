import { type FormEvent, type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { taskCopy } from "./task-copy";
import type { TaskInput } from "./task-model";

export function TaskEditorDialog({
  initial,
  editing,
  busy = false,
  error,
  submit,
  close,
  reload,
  children,
}: {
  initial: TaskInput;
  editing: boolean;
  busy?: boolean;
  error: "invalid" | "failed" | "conflict" | null;
  submit: (event: FormEvent<HTMLFormElement>) => void;
  close: () => void;
  reload?: () => void;
  children: ReactNode;
}) {
  const { locale } = useLocale(),
    c = taskCopy[locale];
  const [returnFocus] = useState(() => document.activeElement);
  const [baseline] = useState(() => ({
    title: initial.title,
    notes: initial.notes,
    status: initial.status,
    start: initial.start_date ?? "",
    due: initial.due_date ?? "",
    assignee: initial.assignee_id ?? "",
  }));
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(dirty || busy, c.discard);
  function discard(action = close) {
    if (!busy && (!dirty || window.confirm(c.discard))) action();
  }
  function changed(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    // The picker’s hidden value updates after this bubbling select event.
    if (
      event.target instanceof HTMLSelectElement &&
      event.target.id === "task-assignee"
    ) {
      data.set("assignee", event.target.value);
    }
    setDirty(
      Object.entries(baseline).some(
        ([key, value]) =>
          String(data.get(key) ?? (key === "assignee" ? value : "")) !== value,
      ),
    );
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) discard();
      }}
    >
      <DialogContent
        title={editing ? c.editTitle : c.add}
        description={c.editorHint}
        closeLabel={c.close}
        className="task-editor-dialog"
        onCloseAutoFocus={(event) => {
          if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
            event.preventDefault();
            returnFocus.focus();
          }
        }}
      >
        <form className="task-editor" onSubmit={submit} onChange={changed}>
          <fieldset disabled={busy} className="project-fields">
            {children}
            <p className="helper-text">{c.datesHint}</p>
            <div className="dialog-actions">
              <Button type="button" variant="outline" onClick={() => discard()}>
                {c.cancel}
              </Button>
              <Button type="submit" disabled={error === "conflict" || !dirty}>
                {busy ? c.loading : c.save}
              </Button>
            </div>
          </fieldset>
          {error && (
            <div className="task-editor-error" role="alert">
              <p>{c[error]}</p>
              {error === "conflict" && reload && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => discard(reload)}
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
