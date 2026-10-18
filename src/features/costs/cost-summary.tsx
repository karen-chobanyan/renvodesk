import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { projectDetailCopy } from "@/features/projects/project-detail-copy";
import { ProjectSkeleton } from "@/features/projects/project-layout";
import { useLocale } from "@/lib/i18n";
import { costCopy } from "./cost-copy";
import { exactMoney } from "./cost-model";
import { getCostSummary, type Summary } from "./cost-service";
export function CostMetrics({
  summary,
  editBudget,
}: {
  summary: Summary;
  editBudget?: () => void;
}) {
  const { locale } = useLocale(),
    c = costCopy[locale];
  const remaining =
    summary.budget_cents === null
      ? null
      : BigInt(summary.budget_cents) - BigInt(summary.total);
  return (
    <div className="metrics">
      <div>
        <span>{c.budget}</span>
        <strong>
          {summary.budget_cents === null
            ? c.unset
            : exactMoney(BigInt(summary.budget_cents), locale)}
        </strong>
        {editBudget && (
          <Button variant="ghost" onClick={editBudget}>
            {summary.budget_cents === null ? c.setBudget : c.editBudget}
          </Button>
        )}
      </div>
      <div>
        <span>{c.actual}</span>
        <strong>{exactMoney(BigInt(summary.total), locale)}</strong>
      </div>
      <div
        className={
          remaining !== null && remaining < 0n ? "cost-over-budget" : undefined
        }
      >
        <span>
          {remaining !== null && remaining < 0n ? c.over : c.remaining}
        </span>
        <strong>
          {remaining === null
            ? "—"
            : exactMoney(remaining < 0n ? -remaining : remaining, locale)}
        </strong>
      </div>
    </div>
  );
}
export function CostSummary({
  org,
  project,
  overview = false,
}: {
  org: string;
  project: string;
  overview?: boolean;
}) {
  const { locale } = useLocale(),
    c = costCopy[locale];
  const [data, setData] = useState<Summary | null>(null),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit retry reloads only this section
  useEffect(() => {
    let active = true;
    setData(null);
    setFailed(false);
    void getCostSummary(org, project)
      .then((s) => {
        if (active) setData(s);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [org, project, retry]);
  return (
    <section
      aria-label={c.title}
      className={overview ? "project-budget-preview" : undefined}
    >
      {overview && <h2>{c.title}</h2>}
      {failed ? (
        <div role="alert">
          <p>{c.error}</p>
          <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
            {c.retry}
          </Button>
        </div>
      ) : data ? (
        <CostMetrics summary={data} />
      ) : (
        <ProjectSkeleton />
      )}
      <p className="helper-text">{c.notice}</p>
      {overview && data && (
        <Link
          className="account-link"
          to={
            data.budget_cents === null
              ? "?tab=budget&editBudget=1"
              : "?tab=budget"
          }
        >
          {data.budget_cents === null
            ? projectDetailCopy[locale].setBudget
            : projectDetailCopy[locale].budget}
        </Link>
      )}
    </section>
  );
}
