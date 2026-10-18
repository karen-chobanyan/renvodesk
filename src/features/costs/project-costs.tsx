import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { today } from "@/features/tasks/task-model";
import { useLocale } from "@/lib/i18n";
import { costCopy } from "./cost-copy";
import {
  budgetDraft,
  CostEditorDialog,
  costDraft,
  VoidCostDialog,
} from "./cost-dialogs";
import { CostLayout, CostReadError, type CostRow } from "./cost-layout";
import type { CostInput } from "./cost-model";
import {
  type Cost,
  getCost,
  getCostSummary,
  listCosts,
  type Summary,
  saveBudget,
  saveCost,
  voidCost,
} from "./cost-service";

type Action =
  | { kind: "budget"; snapshot: Summary }
  | { kind: "cost"; id: string; snapshot: Cost | null }
  | { kind: "void"; snapshot: Cost };
const viewRow = (row: Cost): CostRow => ({
  ...row,
  notes: row.notes ?? "",
  category: row.category as CostInput["category"],
});
export function ProjectCosts({
  org,
  project,
  active = true,
  onChanged,
}: {
  org: string;
  project: string;
  active?: boolean;
  onChanged?: () => void;
}) {
  const { locale } = useLocale(),
    c = costCopy[locale];
  const { session } = useAuth();
  const key = ["workspace", session?.user.id, org, "project-costs", project];
  const summary = useQuery({
    queryKey: [...key, "summary"],
    queryFn: () => getCostSummary(org, project),
    enabled: active,
    staleTime: 0,
    retry: false,
  });
  const ledger = useInfiniteQuery({
    queryKey: [...key, "ledger"],
    queryFn: ({ pageParam }) => listCosts(org, project, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.length === 20 ? pages.length * 20 : undefined,
    enabled: active,
    staleTime: 0,
    retry: false,
  });
  const [action, setAction] = useState<Action | null>(null);
  const [search] = useSearchParams();
  const wantsBudget = active && search.get("editBudget") === "1";
  const consumedBudget = useRef(false);
  useEffect(() => {
    if (!wantsBudget) consumedBudget.current = false;
    else if (summary.data && !consumedBudget.current) {
      consumedBudget.current = true;
      setAction({ kind: "budget", snapshot: summary.data });
    }
  }, [wantsBudget, summary.data]);
  useEffect(() => {
    if (!active) setAction(null);
  }, [active]);
  const refreshSummary = summary.refetch,
    refreshLedger = ledger.refetch;
  useEffect(() => {
    function focus() {
      if (active) {
        void refreshSummary({ cancelRefetch: false });
        void refreshLedger({ cancelRefetch: false });
      }
    }
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [active, refreshSummary, refreshLedger]);
  function changed() {
    void summary.refetch();
    void ledger.refetch();
    onChanged?.();
  }
  const rows = Array.from(
    new Map(
      (ledger.data?.pages.flat() ?? []).map((row) => [row.id, row]),
    ).values(),
  );
  const close = () => setAction(null);
  return (
    <>
      <CostLayout
        summary={summary.data}
        rows={rows.map(viewRow)}
        loading={ledger.isPending}
        add={() =>
          setAction({ kind: "cost", id: crypto.randomUUID(), snapshot: null })
        }
        editBudget={() => {
          if (summary.data)
            setAction({ kind: "budget", snapshot: summary.data });
        }}
        edit={(id) => {
          const row = rows.find((row) => row.id === id);
          if (row) setAction({ kind: "cost", id, snapshot: row });
        }}
        voidRow={(id) => {
          const row = rows.find((row) => row.id === id);
          if (row) setAction({ kind: "void", snapshot: row });
        }}
        summaryState={
          summary.isError ? (
            <CostReadError
              message={c.summaryError}
              retry={() => void summary.refetch()}
              busy={summary.isFetching}
            />
          ) : summary.isPending ? (
            <p role="status">{c.loading}</p>
          ) : undefined
        }
        listState={
          ledger.isError && !ledger.isFetchNextPageError ? (
            <CostReadError
              message={c.listError}
              retry={() => void ledger.refetch()}
              busy={ledger.isFetching}
            />
          ) : ledger.isPending ? (
            <p role="status">{c.loading}</p>
          ) : undefined
        }
        footer={
          <>
            {ledger.isFetchNextPageError && <p role="alert">{c.moreError}</p>}
            {ledger.hasNextPage && (
              <Button
                className="cost-load-more"
                variant="outline"
                disabled={ledger.isFetching}
                onClick={() =>
                  void ledger.fetchNextPage({ cancelRefetch: false })
                }
              >
                {ledger.isFetchingNextPage
                  ? c.loading
                  : ledger.isFetchNextPageError
                    ? c.retry
                    : c.more}
              </Button>
            )}
          </>
        }
      />
      {action?.kind === "budget" && (
        <CostEditorDialog
          kind="budget"
          editing={action.snapshot.budget_cents !== null}
          initial={budgetDraft(action.snapshot.budget_cents)}
          close={close}
          save={async (input) => {
            if (typeof input !== "number") return false;
            const saved = await saveBudget(
              org,
              project,
              input,
              action.snapshot.budget_revision,
            );
            if (saved) changed();
            return !!saved;
          }}
          reload={async () => {
            const fresh = await getCostSummary(org, project);
            setAction({ kind: "budget", snapshot: fresh });
            return budgetDraft(fresh.budget_cents);
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
            today(),
          )}
          close={close}
          save={async (input) => {
            if (typeof input === "number") return false;
            const saved = await saveCost(
              org,
              project,
              action.id,
              input,
              action.snapshot ?? undefined,
            );
            if (saved) changed();
            return !!saved;
          }}
          reload={
            action.snapshot
              ? async () => {
                  const fresh = await getCost(org, project, action.id);
                  setAction({ ...action, snapshot: fresh });
                  return costDraft(viewRow(fresh), today());
                }
              : undefined
          }
        />
      )}
      {action?.kind === "void" && (
        <VoidCostDialog
          row={viewRow(action.snapshot)}
          close={() => {
            close();
            changed();
          }}
          save={async () => !!(await voidCost(action.snapshot))}
        />
      )}
    </>
  );
}
