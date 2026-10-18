import { Plus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { layoutCopy } from "@/features/projects/project-layout";
import { useProjectItemFocus } from "@/features/projects/use-project-item-focus";
import {
  ScheduleEmpty,
  ScheduleWeek,
  TaskDates,
} from "@/features/tasks/schedule-layout";
import { taskCopy } from "@/features/tasks/task-copy";
import { TaskEditorDialog } from "@/features/tasks/task-editor-dialog";
import {
  addDays,
  overdue,
  statuses,
  type TaskInput,
  validTask,
} from "@/features/tasks/task-model";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { DEMO_USER } from "./demo-directory";
import { type DemoTask, say, tx } from "./demo-types";

export type DemoTaskFilter = {
  mode?: "week" | "overdue" | "undated";
  start?: string;
  mine?: boolean;
};

function matches(row: DemoTask, filter: DemoTaskFilter, day: string) {
  if (filter.mine && row.assignee !== DEMO_USER) return false;
  if (filter.mode === "overdue") return overdue(taskInput(row), day);
  if (filter.mode === "undated")
    return row.status !== "done" && !row.start && !row.due;
  if (filter.mode === "week" && filter.start) {
    const end = addDays(filter.start, 6);
    const first = row.start ?? row.due,
      last = row.due ?? row.start;
    return !!first && !!last && first <= end && last >= filter.start;
  }
  return true;
}
function taskInput(row: DemoTask): TaskInput {
  return {
    title: "",
    notes: "",
    status: row.status,
    start_date: row.start,
    due_date: row.due,
    assignee_id: row.assignee,
  };
}

export function useAssigneeName() {
  const { members } = useDemo();
  const d = useDemoCopy();
  return (id: string | null) =>
    id === null
      ? d.unassigned
      : id === DEMO_USER
        ? d.you
        : (members.find((m) => m.id === id)?.name ?? d.unassigned);
}

export function DemoTaskPanel({
  active = true,
  scheduleHref,
  projectId,
  filter = {},
  onClearMine,
}: {
  active?: boolean;
  scheduleHref?: string;
  projectId?: string;
  filter?: DemoTaskFilter;
  onClearMine?: () => void;
}) {
  const { locale } = useLocale(),
    c = taskCopy[locale],
    d = useDemoCopy();
  const { tasks, projects, removeTask, base } = useDemo();
  const assignee = useAssigneeName();
  const [editing, setEditing] = useState<DemoTask | "new" | null>(null),
    [deleting, setDeleting] = useState<DemoTask | null>(null);
  const day = base;
  const rows = tasks
    .filter((row) => !projectId || row.projectId === projectId)
    .filter((row) => matches(row, filter, day))
    .sort(
      (a, b) =>
        Number(a.status === "done") - Number(b.status === "done") ||
        (a.due ?? a.start ?? "9999").localeCompare(b.due ?? b.start ?? "9999"),
    );
  const [search] = useSearchParams();
  const focusId =
    projectId && search.get("tab") === "tasks" ? search.get("task") : null;
  const wantsNew = !!projectId && search.get("new") === "task";
  useEffect(() => {
    if (!active) setEditing(null);
    else if (wantsNew) setEditing("new");
  }, [active, wantsNew]);
  useProjectItemFocus(
    focusId,
    rows.some((row) => row.id === focusId),
    "task",
  );
  const compactWeek = !projectId && filter.mode === "week";
  function taskItem(row: DemoTask) {
    const project = projects.find((p) => p.id === row.projectId);
    return (
      <article
        className={`task-row task-card-${row.status}${compactWeek ? " week-task" : ""}`}
        key={row.id}
        id={projectId ? `task-${row.id}` : undefined}
        tabIndex={-1}
        data-selected={focusId === row.id || undefined}
      >
        <div className="task-content">
          <strong>
            {projectId ? (
              say(row.title, locale)
            ) : (
              <Link
                className="task-title-link"
                to={`/projects/${row.projectId}?tab=tasks`}
              >
                {say(row.title, locale)}
              </Link>
            )}
          </strong>
          {!projectId && (
            <Link
              className="account-link"
              to={`/projects/${row.projectId}?tab=tasks`}
            >
              {project?.name ?? c.project}
            </Link>
          )}
          <small>
            {d.assignee}: {assignee(row.assignee)}
          </small>
          {!compactWeek && row.notes && (
            <p className="task-notes">{say(row.notes, locale)}</p>
          )}
          {!compactWeek && <TaskDates start={row.start} due={row.due} />}
        </div>
        <div className="task-actions">
          <span className={`status task-status-${row.status}`}>
            {c[row.status]}
          </span>
          {overdue(taskInput(row), day) && (
            <span className="task-overdue">{c.overdue}</span>
          )}
          {projectId && (
            <>
              <Button variant="ghost" onClick={() => setEditing(row)}>
                {c.edit}
              </Button>
              <Button variant="ghost" onClick={() => setDeleting(row)}>
                {c.remove}
              </Button>
            </>
          )}
        </div>
      </article>
    );
  }
  return (
    <section
      id={projectId ? "project-tasks" : undefined}
      className="saved-projects task-panel"
      aria-label={projectId ? c.tasks : c.schedule}
    >
      <div className="section-heading project-section-heading">
        <div>
          <h2>
            {projectId
              ? c.tasks
              : filter.mode === "week"
                ? c.scheduledTasks
                : filter.mode === "overdue"
                  ? c.overdue
                  : c.undated}
          </h2>
          {projectId && <p className="page-description">{c.hint}</p>}
        </div>
        {projectId && (
          <div className="task-actions">
            {scheduleHref && (
              <Button asChild variant="ghost">
                <Link to={scheduleHref}>{layoutCopy[locale].schedule}</Link>
              </Button>
            )}
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} />
              {c.add}
            </Button>
          </div>
        )}
      </div>
      {editing && projectId && (
        <DemoTaskEditor
          key={editing === "new" ? "new" : editing.id}
          projectId={projectId}
          task={editing === "new" ? undefined : editing}
          close={() => setEditing(null)}
        />
      )}
      {filter.mode === "week" && filter.start ? (
        <ScheduleWeek
          start={filter.start}
          day={day}
          rows={rows.map((row) => ({
            ...row,
            start_date: row.start,
            due_date: row.due,
          }))}
          item={taskItem}
        />
      ) : (
        <div className="task-list">{rows.map(taskItem)}</div>
      )}
      {rows.length === 0 &&
        (!projectId && filter.mode ? (
          <ScheduleEmpty
            mode={filter.mode}
            mine={!!filter.mine}
            projectsHref="/projects"
            onClearMine={onClearMine}
          />
        ) : (
          <p className="workspace-loading">{c.empty}</p>
        ))}
      {compactWeek && rows.length > 0 && (
        <p className="helper-text">{c.multiDayHint}</p>
      )}
      {rows.length > 0 && (
        <p className="helper-text">
          {d.loaded}: {rows.length}
        </p>
      )}
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent
          title={c.confirm}
          description={deleting ? say(deleting.title, locale) : ""}
          closeLabel={c.close}
        >
          <p>{c.deleteHint}</p>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {c.cancel}
            </Button>
            <Button
              onClick={() => {
                if (deleting) removeTask(deleting);
                setDeleting(null);
              }}
            >
              {c.remove}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DemoTaskEditor({
  projectId,
  task,
  close,
}: {
  projectId: string;
  task?: DemoTask;
  close: () => void;
}) {
  const { locale } = useLocale(),
    c = taskCopy[locale],
    d = useDemoCopy();
  const { saveTask, members } = useDemo();
  const assignee = useAssigneeName();
  const [invalid, setInvalid] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim(),
      notes = String(form.get("notes") ?? "").trim();
    const input: TaskInput = {
      title,
      notes,
      status: String(form.get("status")) as TaskInput["status"],
      start_date: String(form.get("start") ?? "") || null,
      due_date: String(form.get("due") ?? "") || null,
      assignee_id: String(form.get("assignee") ?? "") || null,
    };
    if (!validTask(input)) {
      setInvalid(true);
      return;
    }
    const changedTitle =
      task && title === say(task.title, locale) ? task.title : tx(title, title);
    const changedNotes =
      task?.notes && notes === say(task.notes, locale)
        ? task.notes
        : notes
          ? tx(notes, notes)
          : null;
    saveTask(
      {
        id: task?.id ?? crypto.randomUUID(),
        projectId,
        title: changedTitle,
        notes: changedNotes,
        status: input.status,
        start: input.start_date,
        due: input.due_date,
        assignee: input.assignee_id ?? null,
      },
      !task,
    );
    close();
  }
  return (
    <TaskEditorDialog
      initial={{
        title: task ? say(task.title, locale) : "",
        notes: task?.notes ? say(task.notes, locale) : "",
        status: task?.status ?? "todo",
        start_date: task?.start ?? null,
        due_date: task?.due ?? null,
        assignee_id: task?.assignee ?? null,
      }}
      editing={!!task}
      error={invalid ? "invalid" : null}
      submit={submit}
      close={close}
    >
      <label className="field" htmlFor="demo-task-title">
        {c.title}
        <Input
          id="demo-task-title"
          name="title"
          defaultValue={task ? say(task.title, locale) : ""}
          required
          maxLength={160}
        />
      </label>
      <label className="field" htmlFor="demo-task-assignee">
        {d.assignee}
        <select
          className="input"
          id="demo-task-assignee"
          name="assignee"
          defaultValue={task?.assignee ?? ""}
        >
          <option value="">{d.unassigned}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {assignee(m.id)}
            </option>
          ))}
        </select>
      </label>
      <label className="field" htmlFor="demo-task-status">
        {c.status}
        <select
          className="input"
          id="demo-task-status"
          name="status"
          defaultValue={task?.status ?? "todo"}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {c[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="field" htmlFor="demo-task-start">
        {c.start}
        <Input
          id="demo-task-start"
          name="start"
          type="date"
          min="1900-01-01"
          max="2100-12-31"
          defaultValue={task?.start ?? ""}
        />
      </label>
      <label className="field" htmlFor="demo-task-due">
        {c.due}
        <Input
          id="demo-task-due"
          name="due"
          type="date"
          min="1900-01-01"
          max="2100-12-31"
          defaultValue={task?.due ?? ""}
        />
      </label>
      <label className="field task-notes-field" htmlFor="demo-task-notes">
        {c.notes}
        <textarea
          className="input"
          id="demo-task-notes"
          name="notes"
          maxLength={2000}
          rows={3}
          defaultValue={task?.notes ? say(task.notes, locale) : ""}
        />
      </label>
    </TaskEditorDialog>
  );
}
