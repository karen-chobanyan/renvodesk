import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useWorkspace,
  useWorkspaceRouteState,
} from "@/features/organizations/workspace-context";
import { useLocale } from "@/lib/i18n";
import { ScheduleControls, ScheduleHeader } from "./schedule-layout";
import { taskCopy } from "./task-copy";
import { today, weekStart } from "./task-model";
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
      <ScheduleHeader />
      <ScheduleControls
        mode={mode}
        onMode={setMode}
        mine={mine}
        onMine={setMine}
        start={start}
        onStart={setStart}
        day={today()}
      />
      <TaskPanel
        key={`${organizationId}:${mode}:${start}:${mine}`}
        org={organizationId}
        onClearAssignee={() => setMine(false)}
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
