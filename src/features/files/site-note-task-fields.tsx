import { Button } from "@/components/ui/button";
import { taskCopy } from "@/features/tasks/task-copy";
import { teamCopy } from "@/features/team/team-copy";
import type { TeamMember } from "@/features/team/team-service";
import { useLocale } from "@/lib/i18n";
import type { SiteNoteTaskSuggestion } from "./site-note-ai-service";

export type EditableField = Exclude<keyof SiteNoteTaskSuggestion, "evidence">;

export type TeamState = {
  rows: TeamMember[];
  loading: boolean;
  failed: boolean;
  retry: () => void;
};

// Editable fields for one AI suggestion. Values are controlled by the review
// so a retried save sends exactly what the owner last confirmed.
export function SiteNoteTaskFields({
  id,
  task,
  locked,
  team,
  labels,
  change,
}: {
  id: string;
  task: SiteNoteTaskSuggestion;
  locked: boolean;
  team: TeamState;
  labels: { title: string; notes: string };
  change: (field: EditableField, value: string) => void;
}) {
  const { locale } = useLocale();
  const t = taskCopy[locale],
    teamText = teamCopy[locale];
  const unknownAssignee =
    !!task.assigneeId && !team.rows.some((r) => r.user_id === task.assigneeId);
  return (
    <>
      <label className="field">
        {labels.title}
        <input
          className="input"
          maxLength={160}
          value={task.title}
          disabled={locked}
          onChange={(event) => change("title", event.target.value)}
        />
      </label>
      <div className="field">
        <label htmlFor={`${id}-assignee`}>{teamText.assignee}</label>
        <select
          id={`${id}-assignee`}
          className="input"
          value={task.assigneeId ?? ""}
          disabled={locked || team.loading || team.failed}
          onChange={(event) => change("assigneeId", event.target.value)}
        >
          <option value="">{teamText.unassigned}</option>
          {unknownAssignee && task.assigneeId && (
            <option value={task.assigneeId}>{teamText.savedAssignment}</option>
          )}
          {team.rows.map((row) => (
            <option key={row.user_id} value={row.user_id}>
              {row.email}
            </option>
          ))}
        </select>
        {team.failed && !locked && (
          <div role="alert">
            <p className="helper-text">{teamText.teamError}</p>
            <Button type="button" variant="outline" onClick={team.retry}>
              {teamText.retry}
            </Button>
          </div>
        )}
      </div>
      <div className="site-note-task-dates">
        <label className="field">
          {t.start}
          <input
            className="input"
            type="date"
            min="1900-01-01"
            max="2100-12-31"
            value={task.startDate ?? ""}
            disabled={locked}
            onChange={(event) => change("startDate", event.target.value)}
          />
        </label>
        <label className="field">
          {t.due}
          <input
            className="input"
            type="date"
            min="1900-01-01"
            max="2100-12-31"
            value={task.dueDate ?? ""}
            disabled={locked}
            onChange={(event) => change("dueDate", event.target.value)}
          />
        </label>
      </div>
      <label className="field">
        {labels.notes}
        <textarea
          className="input"
          maxLength={2000}
          value={task.notes}
          disabled={locked}
          onChange={(event) => change("notes", event.target.value)}
        />
      </label>
    </>
  );
}
