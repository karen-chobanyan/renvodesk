import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { getOrganization } from "@/features/organizations/organization-service";
import { teamCopy } from "@/features/team/team-copy";
import { useLocale } from "@/lib/i18n";
import { taskCopy } from "./task-copy";
import { addDays, dateLabel, today, weekStart } from "./task-model";
import { TaskPanel } from "./task-panel";
export function SchedulePage() {
  const { organizationId = "" } = useParams();
  return (
    <CompanySchedule key={organizationId} organizationId={organizationId} />
  );
}
function CompanySchedule({ organizationId }: { organizationId: string }) {
  const [company, setCompany] = useState<string | null>(null),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit reload retries company access
  useEffect(() => {
    let active = true;
    setFailed(false);
    void getOrganization(organizationId)
      .then((row) => {
        if (active) {
          if (row) setCompany(row.name);
          else setFailed(true);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [organizationId, reload]);
  const { locale } = useLocale(),
    c = taskCopy[locale];
  const { session } = useAuth();
  const [mine, setMine] = useState(false);
  const [start, setStart] = useState(() => weekStart(today()));
  const [mode, setMode] = useState<"week" | "overdue" | "undated">("week");
  if (failed || !company)
    return (
      <AppShell live>
        <p role={failed ? "alert" : "status"}>{failed ? c.error : c.loading}</p>
        {failed && (
          <Button onClick={() => setReload((n) => n + 1)}>{c.retry}</Button>
        )}
      </AppShell>
    );
  return (
    <AppShell live company={company}>
      <Link className="back-link" to={`/workspace?company=${organizationId}`}>
        {c.back}
      </Link>
      <PageHeader eyebrow={company} title={c.schedule} description={c.scope} />
      <fieldset className="section-tabs" aria-label={c.schedule}>
        {(["week", "overdue", "undated"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={mode === value ? "selected" : ""}
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            {c[value]}
          </button>
        ))}
      </fieldset>
      {mode === "week" && (
        <div className="week-toolbar">
          <Button
            variant="outline"
            disabled={start <= "1900-01-08"}
            onClick={() => setStart(addDays(start, -7))}
          >
            {c.previous}
          </Button>
          <strong>
            {dateLabel(start, locale)} — {dateLabel(addDays(start, 6), locale)}
          </strong>
          <Button
            variant="outline"
            disabled={start >= "2100-12-24"}
            onClick={() => setStart(addDays(start, 7))}
          >
            {c.next}
          </Button>
          <Button variant="ghost" onClick={() => setStart(weekStart(today()))}>
            {c.today}
          </Button>
        </div>
      )}
      <label className="task-filter">
        <input
          type="checkbox"
          checked={mine}
          onChange={(e) => setMine(e.target.checked)}
        />
        {teamCopy[locale].myTasks}
      </label>
      <TaskPanel
        key={`${organizationId}:${mode}:${start}:${mine}`}
        org={organizationId}
        filter={{
          mode,
          start,
          today: today(),
          assignee: mine ? session?.user.id : undefined,
        }}
      />
    </AppShell>
  );
}
