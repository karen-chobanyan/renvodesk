import { Link, useParams } from "react-router";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useWorkspace,
  useWorkspaceRouteState,
} from "@/features/organizations/workspace-context";
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
  const { organization, loading, failed, refresh } = useWorkspace();
  const company = organization?.name;
  const { locale } = useLocale(),
    c = taskCopy[locale];
  const { session } = useAuth();
  const [mine, setMine] = useWorkspaceRouteState(
    `schedule:${organizationId}:mine`,
    false,
  );
  const [start, setStart] = useWorkspaceRouteState(
    `schedule:${organizationId}:start`,
    weekStart(today()),
  );
  const [mode, setMode] = useWorkspaceRouteState<
    "week" | "overdue" | "undated"
  >(`schedule:${organizationId}:mode`, "week");
  if (failed || !company)
    return (
      <>
        <p role={failed || !loading ? "alert" : "status"}>
          {failed || !loading ? c.error : c.loading}
        </p>
        {(failed || !loading) && (
          <Button onClick={() => void refresh()}>{c.retry}</Button>
        )}
      </>
    );
  return (
    <div className="schedule-workspace">
      <Link className="back-link" to={`/workspace?company=${organizationId}`}>
        {c.back}
      </Link>
      <PageHeader eyebrow={company} title={c.schedule} description={c.scope} />
      <div className="schedule-controls">
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
        <label className="task-filter">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => setMine(e.target.checked)}
          />
          {teamCopy[locale].myTasks}
        </label>
      </div>
      {mode === "week" && (
        <div className="week-toolbar">
          <Button
            variant="outline"
            disabled={start <= "1900-01-08"}
            onClick={() => setStart(addDays(start, -7))}
          >
            {c.previous}
          </Button>
          <strong aria-live="polite">
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
    </div>
  );
}
