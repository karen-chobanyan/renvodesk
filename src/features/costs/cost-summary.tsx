import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProjectSkeleton } from "@/features/projects/project-layout";
import { useLocale } from "@/lib/i18n";
import { costCopy } from "./cost-copy";
import { exactMoney } from "./cost-model";
import { getCostSummary, type Summary } from "./cost-service";
export function CostMetrics({ summary }: { summary: Summary }) {
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
      </div>
      <div>
        <span>{c.actual}</span>
        <strong>{exactMoney(BigInt(summary.total), locale)}</strong>
      </div>
      <div>
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
}: {
  org: string;
  project: string;
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
    <section aria-label={c.title}>
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
    </section>
  );
}
