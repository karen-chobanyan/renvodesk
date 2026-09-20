import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { dateLabel, today } from "@/features/tasks/task-model";
import { useLocale } from "@/lib/i18n";
import { costCopy } from "./cost-copy";
import {
  amountInput,
  type CostInput,
  categories,
  exactMoney,
  parseAmount,
  validCost,
} from "./cost-model";
import {
  type Cost,
  getCostSummary,
  listCosts,
  type Summary,
  saveBudget,
  saveCost,
  voidCost,
} from "./cost-service";
import { CostMetrics } from "./cost-summary";
export function ProjectCosts({
  org,
  project,
  children,
}: {
  org: string;
  project: string;
  children?: ReactNode;
}) {
  const { locale } = useLocale(),
    c = costCopy[locale];
  const [summary, setSummary] = useState<Summary | null>(null),
    [rows, setRows] = useState<Cost[]>([]),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0),
    [more, setMore] = useState(false);
  const [edit, setEdit] = useState<Cost | "new" | null>(null),
    [budgetEdit, setBudgetEdit] = useState(false),
    [voiding, setVoiding] = useState<Cost | null>(null),
    [busy, setBusy] = useState(false),
    [voidError, setVoidError] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit refresh reloads totals and first page
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void Promise.all([getCostSummary(org, project), listCosts(org, project)])
      .then(([s, data]) => {
        if (active) {
          setSummary(s);
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
  }, [org, project, reload]);
  function refresh() {
    setReload((n) => n + 1);
  }
  function saved() {
    setEdit(null);
    setBudgetEdit(false);
    refresh();
  }
  async function loadMore() {
    setLoading(true);
    try {
      const data = await listCosts(org, project, rows.length);
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
  async function confirmVoid() {
    if (!voiding || busy) return;
    setBusy(true);
    try {
      if (!(await voidCost(voiding))) throw new Error("conflict");
      setVoiding(null);
      refresh();
    } catch {
      setVoidError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="project-costs" aria-label={c.title}>
      <p className="helper-text cost-notice">{c.notice}</p>
      {loading && <p role="status">{c.loading}</p>}
      {failed ? (
        <div role="alert">
          <p>{c.error}</p>
          <Button onClick={refresh}>{c.retry}</Button>
        </div>
      ) : (
        summary && (
          <>
            <CostMetrics summary={summary} />
            <div className={children ? "detail-grid" : "cost-ledger"}>
              <div>
                <div className="section-heading">
                  <h2>{c.breakdown}</h2>
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => setBudgetEdit(!budgetEdit)}
                  >
                    {c.editBudget}
                  </Button>
                </div>
                {budgetEdit && (
                  <BudgetEditor
                    key={summary.budget_revision ?? "new"}
                    org={org}
                    project={project}
                    summary={summary}
                    done={saved}
                    cancel={() => setBudgetEdit(false)}
                  />
                )}
                <div className="financial-lines">
                  {categories.map((category) => (
                    <div key={category}>
                      <span>{c[category]}</span>
                      <strong>
                        {exactMoney(BigInt(summary[category]), locale)}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="section-heading costs-heading">
                  <h2>{c.actual}</h2>
                  <div className="task-actions">
                    <Button
                      variant="ghost"
                      disabled={loading}
                      onClick={refresh}
                    >
                      {c.refresh}
                    </Button>
                    <Button onClick={() => setEdit("new")}>{c.add}</Button>
                  </div>
                </div>
                {edit && (
                  <CostEditor
                    key={edit === "new" ? "new" : `${edit.id}:${edit.revision}`}
                    org={org}
                    project={project}
                    record={edit === "new" ? undefined : edit}
                    done={saved}
                    cancel={() => setEdit(null)}
                  />
                )}
                {!rows.length && !loading && (
                  <p className="workspace-loading">{c.empty}</p>
                )}
                {rows.map((row) => (
                  <article className="task-row" key={row.id}>
                    <div className="task-content">
                      <strong>{row.description}</strong>
                      <small>
                        {c[row.category as CostInput["category"]]} ·{" "}
                        {dateLabel(row.incurred_on, locale)}
                      </small>
                      {row.notes && <p className="task-notes">{row.notes}</p>}
                      {row.voided && <span className="status">{c.voided}</span>}
                    </div>
                    <div className="task-actions">
                      <strong>
                        {exactMoney(BigInt(row.amount_cents), locale)}
                      </strong>
                      {!row.voided && (
                        <>
                          <Button variant="ghost" onClick={() => setEdit(row)}>
                            {c.edit}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setVoiding(row);
                              setVoidError(false);
                            }}
                          >
                            {c.void}
                          </Button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
                {more && (
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={loadMore}
                  >
                    {c.more}
                  </Button>
                )}
              </div>
              {children}
            </div>
          </>
        )
      )}
      <Dialog
        open={!!voiding}
        onOpenChange={(open) => {
          if (!open && !busy) setVoiding(null);
        }}
      >
        <DialogContent
          title={c.confirm}
          description={voiding?.description ?? ""}
          closeLabel={c.close}
        >
          <p>{c.voidHint}</p>
          {voidError && <p role="alert">{c.conflict}</p>}
          <div className="dialog-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setVoiding(null)}
            >
              {c.cancel}
            </Button>
            {voidError ? (
              <Button
                onClick={() => {
                  setVoiding(null);
                  refresh();
                }}
              >
                {c.reload}
              </Button>
            ) : (
              <Button disabled={busy} onClick={confirmVoid}>
                {c.void}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
function BudgetEditor({
  org,
  project,
  summary,
  done,
  cancel,
}: {
  org: string;
  project: string;
  summary: Summary;
  done: () => void;
  cancel: () => void;
}) {
  const { locale } = useLocale(),
    c = costCopy[locale];
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<"invalid" | "failed" | "conflict" | null>(
      null,
    );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const amount = parseAmount(
      String(new FormData(e.currentTarget).get("budget") ?? ""),
    );
    if (amount === null) {
      setError("invalid");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const row = await saveBudget(
        org,
        project,
        amount,
        summary.budget_revision,
      );
      if (!row) setError("conflict");
      else done();
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="company-form task-editor" onSubmit={submit}>
      <fieldset className="project-fields" disabled={busy}>
        <label className="field" htmlFor="cost-budget">
          {c.budget}
          <Input
            id="cost-budget"
            name="budget"
            inputMode="decimal"
            required
            defaultValue={
              summary.budget_cents === null
                ? ""
                : amountInput(summary.budget_cents)
            }
          />
        </label>
        <p className="helper-text">{c.budgetHint}</p>
        <div className="dialog-actions">
          <Button type="button" variant="outline" onClick={cancel}>
            {c.cancel}
          </Button>
          <Button disabled={error === "conflict"}>{c.saveBudget}</Button>
        </div>
      </fieldset>
      {error && (
        <div role="alert">
          <p>{c[error]}</p>
          <Button type="button" onClick={done}>
            {c.reload}
          </Button>
        </div>
      )}
    </form>
  );
}
function CostEditor({
  org,
  project,
  record,
  done,
  cancel,
}: {
  org: string;
  project: string;
  record?: Cost;
  done: () => void;
  cancel: () => void;
}) {
  const { locale } = useLocale(),
    c = costCopy[locale];
  const [id] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<"invalid" | "failed" | "conflict" | null>(
      null,
    );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const input: CostInput = {
      description: String(form.get("description") ?? "").trim(),
      category: String(form.get("category")) as CostInput["category"],
      amount_cents: parseAmount(String(form.get("amount") ?? "")) ?? -1,
      incurred_on: String(form.get("date") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    if (!validCost(input)) {
      setError("invalid");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const row = await saveCost(org, project, id, input, record);
      if (!row) setError("conflict");
      else done();
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="company-form task-editor" onSubmit={submit}>
      <fieldset className="project-fields" disabled={busy}>
        <label className="field" htmlFor="cost-description">
          {c.description}
          <Input
            id="cost-description"
            name="description"
            defaultValue={record?.description ?? ""}
            required
            maxLength={200}
          />
        </label>
        <label className="field" htmlFor="cost-category">
          {c.category}
          <select
            className="input"
            id="cost-category"
            name="category"
            defaultValue={record?.category ?? "materials"}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {c[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="cost-amount">
          {c.amount}
          <Input
            id="cost-amount"
            name="amount"
            required
            inputMode="decimal"
            defaultValue={record ? amountInput(record.amount_cents) : ""}
          />
        </label>
        <label className="field" htmlFor="cost-date">
          {c.date}
          <Input
            id="cost-date"
            name="date"
            type="date"
            required
            min="1900-01-01"
            max="2100-12-31"
            defaultValue={record?.incurred_on ?? today()}
          />
        </label>
        <label className="field task-notes-field" htmlFor="cost-notes">
          {c.notes}
          <textarea
            className="input"
            id="cost-notes"
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={record?.notes ?? ""}
          />
        </label>
        <div className="dialog-actions">
          <Button type="button" variant="outline" onClick={cancel}>
            {c.cancel}
          </Button>
          <Button disabled={error === "conflict"}>{c.save}</Button>
        </div>
      </fieldset>
      {error && (
        <div role="alert">
          <p>{c[error]}</p>
          <Button type="button" onClick={done}>
            {c.reload}
          </Button>
        </div>
      )}
    </form>
  );
}
