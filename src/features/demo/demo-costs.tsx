import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  budgetDraft,
  CostEditorDialog,
  costDraft,
  VoidCostDialog,
} from "@/features/costs/cost-dialogs";
import { CostLayout, type CostRow } from "@/features/costs/cost-layout";
import type { Summary } from "@/features/costs/cost-service";
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

type Action =
  | { kind: "budget"; cents: number | null }
  | { kind: "cost"; id: string; snapshot: DemoCost | null }
  | { kind: "void"; snapshot: DemoCost };
export function DemoCosts({
  projectId,
  active = true,
}: {
  projectId: string;
  active?: boolean;
}) {
  const { locale } = useLocale();
  const { costs, saveCost, setBudget, base } = useDemo();
  const summary = useDemoSummary(projectId);
  const [action, setAction] = useState<Action | null>(null);
  const [search] = useSearchParams();
  const wantsBudget = active && search.get("editBudget") === "1";
  const consumed = useRef(false);
  useEffect(() => {
    if (!wantsBudget) consumed.current = false;
    else if (!consumed.current) {
      consumed.current = true;
      setAction({ kind: "budget", cents: summary.budget_cents });
    }
  }, [wantsBudget, summary.budget_cents]);
  useEffect(() => {
    if (!active) setAction(null);
  }, [active]);
  const rows = costs
    .filter((row) => row.projectId === projectId)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const viewRow = (row: DemoCost): CostRow => ({
    id: row.id,
    description: say(row.description, locale),
    category: row.category,
    amount_cents: row.amountCents,
    incurred_on: row.date,
    notes: row.notes ? say(row.notes, locale) : "",
    voided: row.voided,
  });
  const close = () => setAction(null);
  return (
    <>
      <CostLayout
        summary={summary}
        rows={rows.map(viewRow)}
        add={() =>
          setAction({ kind: "cost", id: crypto.randomUUID(), snapshot: null })
        }
        editBudget={() =>
          setAction({ kind: "budget", cents: summary.budget_cents })
        }
        edit={(id) => {
          const row = rows.find((row) => row.id === id);
          if (row) setAction({ kind: "cost", id, snapshot: row });
        }}
        voidRow={(id) => {
          const row = rows.find((row) => row.id === id);
          if (row) setAction({ kind: "void", snapshot: row });
        }}
      />
      {action?.kind === "budget" && (
        <CostEditorDialog
          kind="budget"
          editing={action.cents !== null}
          initial={budgetDraft(action.cents)}
          close={close}
          save={async (input) => {
            if (typeof input !== "number") return false;
            setBudget(projectId, input);
            return true;
          }}
        />
      )}
      {action?.kind === "cost" && (
        <CostEditorDialog
          key={action.id}
          kind="cost"
          editing={!!action.snapshot}
          initial={costDraft(
            action.snapshot ? viewRow(action.snapshot) : null,
            base,
          )}
          close={close}
          save={async (input) => {
            if (typeof input === "number") return false;
            const record = action.snapshot;
            const keep = (old: DemoCost["notes"], value: string) =>
              old && say(old, locale) === value
                ? old
                : value
                  ? tx(value, value)
                  : null;
            saveCost(
              {
                id: action.id,
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
            return true;
          }}
        />
      )}
      {action?.kind === "void" && (
        <VoidCostDialog
          row={viewRow(action.snapshot)}
          close={close}
          save={async () => {
            saveCost({ ...action.snapshot, voided: true }, false);
            return true;
          }}
        />
      )}
    </>
  );
}
