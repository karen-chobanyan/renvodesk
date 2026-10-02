import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { costCopy } from "@/features/costs/cost-copy";
import {
  amountInput,
  type CostInput,
  categories,
  exactMoney,
  parseAmount,
  validCost,
} from "@/features/costs/cost-model";
import type { Summary } from "@/features/costs/cost-service";
import { CostMetrics } from "@/features/costs/cost-summary";
import { dateLabel } from "@/features/tasks/task-model";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { type DemoCost, say, tx } from "./demo-types";

/** Same shape as the live summary RPC; voided entries are excluded from totals. */
export function demoSummary(
  costs: DemoCost[],
  projectId: string,
  budget: number | null,
): Summary {
  const live = costs.filter((c) => c.projectId === projectId && !c.voided);
  const sum = (category?: string) =>
    String(
      live
        .filter((c) => !category || c.category === category)
        .reduce((total, c) => total + BigInt(c.amountCents), 0n),
    );
  return {
    budget_cents: budget,
    budget_revision: budget === null ? null : 1,
    materials: sum("materials"),
    labor: sum("labor"),
    subcontractors: sum("subcontractors"),
    other: sum("other"),
    total: sum(),
  };
}

export function useDemoSummary(projectId: string) {
  const { costs, budgets } = useDemo();
  return demoSummary(costs, projectId, budgets[projectId] ?? null);
}

export function DemoCosts({ projectId }: { projectId: string }) {
  const { locale } = useLocale(),
    c = costCopy[locale];
  const { costs, saveCost } = useDemo();
  const summary = useDemoSummary(projectId);
  const [budgetEdit, setBudgetEdit] = useState(false),
    [edit, setEdit] = useState<DemoCost | "new" | null>(null),
    [voiding, setVoiding] = useState<DemoCost | null>(null);
  const rows = costs
    .filter((row) => row.projectId === projectId)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section id="project-costs" aria-label={c.title}>
      <p className="helper-text cost-notice">{c.notice}</p>
      <CostMetrics summary={summary} />
      <div className="cost-ledger">
        <div>
          <div className="section-heading">
            <h2>{c.breakdown}</h2>
            <Button
              variant="outline"
              onClick={() => setBudgetEdit(!budgetEdit)}
            >
              {c.editBudget}
            </Button>
          </div>
          {budgetEdit && (
            <BudgetEditor
              projectId={projectId}
              current={summary.budget_cents}
              done={() => setBudgetEdit(false)}
            />
          )}
          <div className="financial-lines">
            {categories.map((category) => (
              <div key={category}>
                <span>{c[category]}</span>
                <strong>{exactMoney(BigInt(summary[category]), locale)}</strong>
              </div>
            ))}
          </div>
          <div className="section-heading costs-heading">
            <h2>{c.actual}</h2>
            <div className="task-actions">
              <Button onClick={() => setEdit("new")}>{c.add}</Button>
            </div>
          </div>
          {edit && (
            <CostEditor
              key={edit === "new" ? "new" : edit.id}
              projectId={projectId}
              record={edit === "new" ? undefined : edit}
              done={() => setEdit(null)}
            />
          )}
          {!rows.length && <p className="workspace-loading">{c.empty}</p>}
          {rows.map((row) => (
            <article className="task-row" key={row.id}>
              <div className="task-content">
                <strong>{say(row.description, locale)}</strong>
                <small>
                  {c[row.category]} · {dateLabel(row.date, locale)}
                </small>
                {row.notes && (
                  <p className="task-notes">{say(row.notes, locale)}</p>
                )}
                {row.voided && <span className="status">{c.voided}</span>}
              </div>
              <div className="task-actions">
                <strong>{exactMoney(BigInt(row.amountCents), locale)}</strong>
                {!row.voided && (
                  <>
                    <Button variant="ghost" onClick={() => setEdit(row)}>
                      {c.edit}
                    </Button>
                    <Button variant="ghost" onClick={() => setVoiding(row)}>
                      {c.void}
                    </Button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
      <Dialog
        open={!!voiding}
        onOpenChange={(open) => {
          if (!open) setVoiding(null);
        }}
      >
        <DialogContent
          title={c.confirm}
          description={voiding ? say(voiding.description, locale) : ""}
          closeLabel={c.close}
        >
          <p>{c.voidHint}</p>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setVoiding(null)}>
              {c.cancel}
            </Button>
            <Button
              onClick={() => {
                if (voiding) saveCost({ ...voiding, voided: true }, false);
                setVoiding(null);
              }}
            >
              {c.void}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function BudgetEditor({
  projectId,
  current,
  done,
}: {
  projectId: string;
  current: number | null;
  done: () => void;
}) {
  const { locale } = useLocale(),
    c = costCopy[locale];
  const { setBudget } = useDemo();
  const [invalid, setInvalid] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cents = parseAmount(
      String(new FormData(e.currentTarget).get("budget") ?? ""),
    );
    if (cents === null) {
      setInvalid(true);
      return;
    }
    setBudget(projectId, cents);
    done();
  }
  return (
    <form className="company-form task-editor" onSubmit={submit}>
      <fieldset className="project-fields">
        <label className="field" htmlFor="demo-cost-budget">
          {c.budget}
          <Input
            id="demo-cost-budget"
            name="budget"
            inputMode="decimal"
            required
            defaultValue={current === null ? "" : amountInput(current)}
          />
        </label>
        <p className="helper-text">{c.budgetHint}</p>
        <div className="dialog-actions">
          <Button type="button" variant="outline" onClick={done}>
            {c.cancel}
          </Button>
          <Button>{c.saveBudget}</Button>
        </div>
      </fieldset>
      {invalid && <p role="alert">{c.invalid}</p>}
    </form>
  );
}

function CostEditor({
  projectId,
  record,
  done,
}: {
  projectId: string;
  record?: DemoCost;
  done: () => void;
}) {
  const { locale, t } = useLocale(),
    c = costCopy[locale];
  const { saveCost, base } = useDemo();
  const [invalid, setInvalid] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const amount = parseAmount(String(form.get("amount") ?? ""));
    const input: CostInput = {
      description: String(form.get("description") ?? "").trim(),
      category: String(form.get("category")) as CostInput["category"],
      amount_cents: amount ?? -1,
      incurred_on: String(form.get("date") ?? ""),
      notes: String(form.get("notes") ?? "").trim(),
    };
    if (amount === null || !validCost(input)) {
      setInvalid(true);
      return;
    }
    const keep = (old: DemoCost["notes"], value: string) =>
      old && say(old, locale) === value ? old : value ? tx(value, value) : null;
    saveCost(
      {
        id: record?.id ?? crypto.randomUUID(),
        projectId,
        description:
          keep(record?.description ?? null, input.description) ??
          tx(input.description, input.description),
        category: input.category,
        amountCents: input.amount_cents,
        date: input.incurred_on,
        notes: keep(record?.notes ?? null, input.notes),
        voided: false,
      },
      !record,
    );
    done();
  }
  return (
    <form className="company-form task-editor" onSubmit={submit}>
      <fieldset className="project-fields">
        <label className="field" htmlFor="demo-cost-description">
          {c.description}
          <Input
            id="demo-cost-description"
            name="description"
            required
            maxLength={200}
            defaultValue={record ? say(record.description, locale) : ""}
          />
        </label>
        <label className="field" htmlFor="demo-cost-category">
          {c.category}
          <select
            className="input"
            id="demo-cost-category"
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
        <label className="field" htmlFor="demo-cost-amount">
          {c.amount}
          <Input
            id="demo-cost-amount"
            name="amount"
            inputMode="decimal"
            required
            defaultValue={record ? amountInput(record.amountCents) : ""}
          />
        </label>
        <label className="field" htmlFor="demo-cost-date">
          {c.date}
          <Input
            id="demo-cost-date"
            name="date"
            type="date"
            required
            min="1900-01-01"
            max="2100-12-31"
            defaultValue={record?.date ?? base}
          />
        </label>
        <label className="field task-notes-field" htmlFor="demo-cost-notes">
          {c.notes}
          <textarea
            className="input"
            id="demo-cost-notes"
            name="notes"
            rows={2}
            maxLength={1000}
            defaultValue={record?.notes ? say(record.notes, locale) : ""}
          />
        </label>
        <div className="dialog-actions">
          <Button type="button" variant="outline" onClick={done}>
            {c.cancel}
          </Button>
          <Button>{c.save}</Button>
        </div>
      </fieldset>
      {invalid && <p role="alert">{c.invalid}</p>}
      <p className="helper-text">{t("excludingTax")}</p>
    </form>
  );
}
