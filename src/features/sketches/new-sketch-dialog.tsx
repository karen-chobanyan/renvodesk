import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { sketchCopy } from "./sketch-copy";

export function NewSketchDialog({
  create,
  close,
  unavailable,
}: {
  create?: (title: string, id: string) => Promise<void>;
  close: () => void;
  unavailable?: string;
}) {
  const { locale } = useLocale(),
    c = sketchCopy[locale];
  const [title, setTitle] = useState(""),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const [request, setRequest] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [returnFocus] = useState(() => document.activeElement);
  useUnsavedChangesGuard(!!title || busy, c.leave);
  function cancel() {
    if (!busy && (!title || window.confirm(c.leave))) close();
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      <DialogContent
        title={c.new}
        description={c.hint}
        closeLabel={c.cancel}
        className="new-sketch-dialog"
        onCloseAutoFocus={(event) => {
          if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
            event.preventDefault();
            returnFocus.focus();
          }
        }}
      >
        <form
          className="project-details-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!create || busy || !title.trim()) return;
            const attempt = request ?? {
              id: crypto.randomUUID(),
              title: title.trim(),
            };
            setRequest(attempt);
            setBusy(true);
            setFailed(false);
            try {
              await create(attempt.title, attempt.id);
            } catch {
              setFailed(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field" htmlFor="new-sketch">
            {c.name}
            <Input
              id="new-sketch"
              value={title}
              required
              maxLength={120}
              disabled={busy || !!request}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          {unavailable && <p className="helper-text">{unavailable}</p>}
          {failed && (
            <p role="alert" className="error-message">
              {c.createFailed}
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
            <Button disabled={busy || !title.trim() || !create}>
              {busy ? c.loading : failed ? c.retry : c.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
