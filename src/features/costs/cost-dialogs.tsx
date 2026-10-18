import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { costCopy } from "./cost-copy";
import type { CostRow } from "./cost-layout";
import {
  amountInput,
  type CostInput,
  categories,
  exactMoney,
  parseAmount,
  validCost,
} from "./cost-model";

export type CostDraft = {
  description: string;
  category: CostInput["category"];
  amount: string;
  date: string;
  notes: string;
};
export function costDraft(record: CostInput | null, date: string): CostDraft {
  return {
    description: record?.description ?? "",
    category: record?.category ?? "materials",
    amount: record ? amountInput(record.amount_cents) : "",
    date: record?.incurred_on ?? date,
    notes: record?.notes ?? "",
  };
}
export function budgetDraft(cents: number | null): CostDraft {
  return {
    ...costDraft(null, ""),
    amount: cents === null ? "" : amountInput(cents),
  };
}

export function CostEditorDialog({
  kind,
  editing,
  initial,
  save,
  reload,
  close,
}: {
  kind: "budget" | "cost";
  editing: boolean;
  initial: CostDraft;
  save: (input: CostInput | number) => Promise<boolean>;
  reload?: () => Promise<CostDraft>;
  close: () => void;
}) {
  const { locale } = useLocale(),
    c = costCopy[locale];
  const [draft, setDraft] = useState(initial),
    [baseline, setBaseline] = useState(initial);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<"invalid" | "failed" | "conflict" | null>(
      null,
    ),
    [reloadFailed, setReloadFailed] = useState(false);
  const [returnFocus] = useState(() => document.activeElement);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useUnsavedChangesGuard(dirty || busy, c.discard);
  function cancel() {
    if (!busy && (!dirty || window.confirm(c.discard))) close();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || error === "conflict") return;
    const amount = parseAmount(draft.amount);
    const input: CostInput = {
      description: draft.description.trim(),
      category: draft.category,
      amount_cents: amount ?? -1,
      incurred_on: draft.date,
      notes: draft.notes.trim(),
    };
    if (
      amount === null ||
      (kind === "budget" ? amount < 0 || amount > 999999999 : !validCost(input))
    ) {
      setError("invalid");
      return;
    }
    setBusy(true);
    setError(null);
    setReloadFailed(false);
    try {
      if (await save(kind === "budget" ? amount : input)) close();
      else setError("conflict");
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    if (!reload || busy || !window.confirm(c.replace)) return;
    setBusy(true);
    setReloadFailed(false);
    try {
      const fresh = await reload();
      setDraft(fresh);
      setBaseline(fresh);
      setError(null);
    } catch {
      setReloadFailed(true);
    } finally {
      setBusy(false);
    }
  }
  const field = (key: keyof CostDraft, value: string) =>
    setDraft((old) => ({ ...old, [key]: value }));
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      <DialogContent
        title={
          kind === "budget"
            ? editing
              ? c.editBudget
              : c.setBudget
            : editing
              ? c.editTitle
              : c.add
        }
        description={
          kind === "budget" ? `${c.budgetHint} ${c.editorHint}` : c.editorHint
        }
        closeLabel={c.close}
        className={
          kind === "budget"
            ? "cost-editor-dialog cost-budget-dialog"
            : "task-editor-dialog cost-editor-dialog"
        }
        onCloseAutoFocus={(event) => {
          if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
            event.preventDefault();
            returnFocus.focus();
          }
        }}
      >
        <form className="task-editor" onSubmit={submit}>
          <fieldset disabled={busy} className="project-fields">
            {kind === "cost" && (
              <>
                <label
                  className="field cost-description-field"
                  htmlFor="cost-description"
                >
                  {c.description}
                  <Input
                    id="cost-description"
                    required
                    maxLength={200}
                    value={draft.description}
                    onChange={(e) => field("description", e.target.value)}
                  />
                </label>
                <label className="field" htmlFor="cost-category">
                  {c.category}
                  <select
                    id="cost-category"
                    className="input"
                    value={draft.category}
                    onChange={(e) => field("category", e.target.value)}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {c[category]}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className="field" htmlFor="cost-amount">
              {kind === "budget" ? c.budget : c.amount}
              <Input
                id="cost-amount"
                inputMode="decimal"
                required
                value={draft.amount}
                aria-invalid={error === "invalid"}
                aria-describedby={
                  error === "invalid" ? "cost-editor-error" : undefined
                }
                onChange={(e) => field("amount", e.target.value)}
              />
            </label>
            {kind === "cost" && (
              <>
                <label className="field" htmlFor="cost-date">
                  {c.date}
                  <Input
                    id="cost-date"
                    type="date"
                    min="1900-01-01"
                    max="2100-12-31"
                    required
                    value={draft.date}
                    onChange={(e) => field("date", e.target.value)}
                  />
                </label>
                <label className="field task-notes-field" htmlFor="cost-notes">
                  {c.notes}
                  <textarea
                    id="cost-notes"
                    className="input"
                    rows={3}
                    maxLength={2000}
                    value={draft.notes}
                    onChange={(e) => field("notes", e.target.value)}
                  />
                </label>
              </>
            )}
            <div className="dialog-actions">
              <Button type="button" variant="outline" onClick={cancel}>
                {c.cancel}
              </Button>
              <Button
                type="submit"
                disabled={
                  error === "conflict" || (!dirty && error !== "failed")
                }
              >
                {busy ? c.loading : kind === "budget" ? c.saveBudget : c.save}
              </Button>
            </div>
          </fieldset>
          {error && (
            <div
              className="task-editor-error"
              id="cost-editor-error"
              role="alert"
            >
              <p>
                {error === "invalid" && kind === "budget"
                  ? c.invalidBudget
                  : c[error]}
              </p>
              {reload && error !== "invalid" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={recover}
                >
                  {c.reload}
                </Button>
              )}
            </div>
          )}
          {reloadFailed && <p role="alert">{c.reloadFailed}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VoidCostDialog({
  row,
  save,
  close,
}: {
  row: CostRow;
  save: () => Promise<boolean>;
  close: () => void;
}) {
  const { locale } = useLocale(),
    c = costCopy[locale];
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<"conflict" | "failed" | null>(null);
  const [returnFocus] = useState(() => document.activeElement);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent
        title={c.confirm}
        description={`${row.description} · ${exactMoney(BigInt(row.amount_cents), locale)}`}
        closeLabel={c.close}
        onCloseAutoFocus={(event) => {
          if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
            event.preventDefault();
            returnFocus.focus();
          }
        }}
      >
        <p>{c.voidHint}</p>
        {error && <p role="alert">{c[error]}</p>}
        {error === "conflict" && (
          <Button variant="outline" onClick={close}>
            {c.reload}
          </Button>
        )}
        <div className="dialog-actions">
          <Button variant="outline" disabled={busy} onClick={close}>
            {c.cancel}
          </Button>
          <Button
            disabled={busy || error === "conflict"}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                if (await save()) close();
                else setError("conflict");
              } catch {
                setError("failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? c.loading : c.void}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
