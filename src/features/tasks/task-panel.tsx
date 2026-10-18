import { Plus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { projectDetailCopy } from "@/features/projects/project-detail-copy";
import { layoutCopy } from "@/features/projects/project-layout";
import { useProjectItemFocus } from "@/features/projects/use-project-item-focus";
import { AssigneePicker } from "@/features/team/assignee-picker";
import { useCompanyAccess } from "@/features/team/company-access";
import { teamCopy } from "@/features/team/team-copy";
import { listTeam, type TeamMember } from "@/features/team/team-service";
import { useLocale } from "@/lib/i18n";
import { ScheduleEmpty, ScheduleWeek, TaskDates } from "./schedule-layout";
import { taskCopy } from "./task-copy";
import { TaskEditorDialog } from "./task-editor-dialog";
import {
  overdue,
  statuses,
  type TaskInput,
  today,
  validTask,
} from "./task-model";
import {
  createTask,
  deleteTask,
  listTasks,
  TASK_PAGE_SIZE,
  type Task,
  type TaskFilter,
  updateTask,
} from "./task-service";

export function TaskPanel({
  active = true,
  org,
  project,
  filter = {},
  refreshKey = 0,
  onClearAssignee,
  onChanged,
  scheduleHref,
}: {
  active?: boolean;
  org: string;
  project?: string;
  filter?: TaskFilter;
  refreshKey?: number;
  onClearAssignee?: () => void;
  onChanged?: () => void;
  scheduleHref?: string;
}) {
  const { locale } = useLocale(),
    c = taskCopy[locale];
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listTasks>>>([]);
  const [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [more, setMore] = useState(false),
    [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<Task | "new" | null>(null),
    [deleting, setDeleting] = useState<Task | null>(null),
    [busy, setBusy] = useState(false),
    [deleteError, setDeleteError] = useState(false);
  const access = useCompanyAccess(org);
  const teamText = teamCopy[locale];
  const [people, setPeople] = useState<TeamMember[]>([]);
  useEffect(() => {
    let active = true;
    void listTeam(org)
      .then((data) => {
        if (active) setPeople(data);
      })
      .catch(() => {
        if (active) setPeople([]);
      });
    return () => {
      active = false;
    };
  }, [org]);
  const day = today();
  const { mode, start, today: filterToday, assignee } = filter;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload explicitly refreshes saved data
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void listTasks(org, { project, mode, start, today: filterToday, assignee })
      .then((data) => {
        if (active) {
          setRows(data);
          setMore(data.length === TASK_PAGE_SIZE);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [org, project, mode, start, filterToday, assignee, reload, refreshKey]);
  const [search] = useSearchParams();
  const focusId =
    project && search.get("tab") === "tasks" ? search.get("task") : null;
  const wantsNew =
    project && search.get("tab") === "tasks" && search.get("new") === "task";
  const [focused, setFocused] = useState<(typeof rows)[number] | null>(null),
    [focusFailed, setFocusFailed] = useState(false);
  useEffect(() => {
    if (!active) setEditing(null);
    else if (wantsNew && access.owner) setEditing("new");
  }, [active, wantsNew, access.owner]);
  useEffect(() => {
    setFocused(null);
    setFocusFailed(false);
    if (
      !focusId ||
      !project ||
      loading ||
      rows.some((row) => row.id === focusId)
    )
      return;
    let active = true;
    void listTasks(org, { project, id: focusId })
      .then((data) => {
        if (active) {
          setFocused(data[0] ?? null);
          setFocusFailed(!data.length);
        }
      })
      .catch(() => {
        if (active) setFocusFailed(true);
      });
    return () => {
      active = false;
    };
  }, [focusId, project, org, loading, rows]);
  useProjectItemFocus(
    focusId,
    !loading && (!!focused || rows.some((row) => row.id === focusId)),
    "task",
  );
  async function loadMore() {
    setLoading(true);
    try {
      const data = await listTasks(
        org,
        { project, mode, start, today: filterToday, assignee },
        rows.length,
      );
      setRows((old) => [
        ...old,
        ...data.filter((x) => !old.some((y) => y.id === x.id)),
      ]);
      setMore(data.length === TASK_PAGE_SIZE);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  function refresh() {
    setReload((n) => n + 1);
    onChanged?.();
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      const result = await deleteTask(deleting);
      if (!result) throw new Error("conflict");
      setDeleting(null);
      refresh();
    } catch {
      setDeleteError(true);
    } finally {
      setBusy(false);
    }
  }
  const compactWeek = !project && mode === "week";
  function taskItem(row: (typeof rows)[number]) {
    return (
      <article
        className={`task-row task-card-${row.status}${compactWeek ? " week-task" : ""}`}
        key={row.id}
        id={project ? `task-${row.id}` : undefined}
        tabIndex={-1}
        data-selected={focusId === row.id || undefined}
      >
        <div className="task-content">
          <strong>
            {project ? (
              row.title
            ) : (
              <Link
                className="task-title-link"
                to={`/workspace/${org}/projects/${row.project_id}?tab=tasks`}
              >
                {row.title}
              </Link>
            )}
          </strong>
          {!project && (
            <Link
              className="account-link"
              to={`/workspace/${org}/projects/${row.project_id}?tab=tasks`}
            >
              {row.projects?.name ?? c.project}
            </Link>
          )}
          <small>
            {teamText.assignee}:{" "}
            {row.assignee_id
              ? (people.find((p) => p.user_id === row.assignee_id)?.email ??
                teamText.savedAssignment)
              : teamText.unassigned}
          </small>
          {!compactWeek && row.notes && (
            <p className="task-notes">{row.notes}</p>
          )}
          {!compactWeek && (
            <TaskDates start={row.start_date} due={row.due_date} />
          )}
        </div>
        <div className="task-actions">
          <span className={`status task-status-${row.status}`}>
            {c[row.status as "todo" | "in_progress" | "done"]}
          </span>
          {overdue(
            { ...row, status: row.status as TaskInput["status"] },
            day,
          ) && <span className="task-overdue">{c.overdue}</span>}
          {project &&
            (access.owner ||
              (access.role === "member" &&
                row.assignee_id === access.user)) && (
              <>
                <Button variant="ghost" onClick={() => setEditing(row)}>
                  {c.edit}
                </Button>
                {access.owner && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDeleting(row);
                      setDeleteError(false);
                    }}
                  >
                    {c.remove}
                  </Button>
                )}
              </>
            )}
        </div>
      </article>
    );
  }
  return (
    <section
      id={project ? "project-tasks" : undefined}
      className="saved-projects task-panel"
      aria-label={project ? c.tasks : c.schedule}
    >
      <div className="section-heading project-section-heading">
        <div>
          <h2>
            {project
              ? c.tasks
              : mode === "week"
                ? c.scheduledTasks
                : mode === "overdue"
                  ? c.overdue
                  : c.undated}
          </h2>
          {project && <p className="page-description">{c.hint}</p>}
        </div>
        <div className="task-actions">
          {scheduleHref && (
            <Button asChild variant="ghost">
              <Link to={scheduleHref}>{layoutCopy[locale].schedule}</Link>
            </Button>
          )}
          {!project && (
            <Button variant="outline" disabled={loading} onClick={refresh}>
              {c.refresh}
            </Button>
          )}
          {project && access.owner && (
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} />
              {c.add}
            </Button>
          )}
        </div>
      </div>
      {access.role === "member" && (
        <p className="helper-text">{teamText.readOnly}</p>
      )}
      {editing && project && (
        <TaskEditor
          key={editing === "new" ? "new" : `${editing.id}:${editing.revision}`}
          org={org}
          canAssign={access.owner}
          project={project}
          task={editing === "new" ? undefined : editing}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {focusFailed && (
        <p role="alert">
          {projectDetailCopy[locale].missingItem}{" "}
          <Button variant="ghost" onClick={refresh}>
            {c.retry}
          </Button>
        </p>
      )}
      {focused && !rows.some((row) => row.id === focused.id) && (
        <section aria-label={projectDetailCopy[locale].selected}>
          {taskItem(focused)}
        </section>
      )}
      {loading && <p role="status">{c.loading}</p>}
      {failed ? (
        <div role="alert">
          <p>{c.error}</p>
          <Button onClick={refresh}>{c.retry}</Button>
        </div>
      ) : (
        <>
          {mode === "week" && start ? (
            <ScheduleWeek
              start={start}
              day={day}
              rows={rows}
              loading={loading}
              item={taskItem}
            />
          ) : (
            <div className="task-list">{rows.map(taskItem)}</div>
          )}
          {!loading &&
            rows.length === 0 &&
            !focused &&
            (!project && mode ? (
              <ScheduleEmpty
                mode={mode}
                mine={!!assignee}
                projectsHref={`/workspace?company=${org}`}
                onClearMine={onClearAssignee}
              />
            ) : (
              <p className="workspace-loading">{c.empty}</p>
            ))}
          {compactWeek && rows.length > 0 && (
            <p className="helper-text">{c.multiDayHint}</p>
          )}
          {more && (
            <Button variant="outline" disabled={loading} onClick={loadMore}>
              {c.more}
            </Button>
          )}
          {rows.length > 0 && (
            <p className="helper-text">
              {c.loaded}: {rows.length}
              {more ? "+" : ""}
            </p>
          )}
        </>
      )}
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <DialogContent
          title={c.confirm}
          description={deleting?.title ?? ""}
          closeLabel={c.close}
        >
          <p>{c.deleteHint}</p>
          {deleteError && <p role="alert">{c.deleteFailed}</p>}
          <div className="dialog-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              {c.cancel}
            </Button>
            {deleteError ? (
              <Button
                onClick={() => {
                  setDeleting(null);
                  refresh();
                }}
              >
                {c.reload}
              </Button>
            ) : (
              <Button disabled={busy} onClick={remove}>
                {c.remove}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
function TaskEditor({
  org,
  project,
  task,
  canAssign,
  close,
  saved,
}: {
  org: string;
  project: string;
  task?: Task;
  canAssign: boolean;
  close: () => void;
  saved: () => void;
}) {
  const { locale } = useLocale(),
    c = taskCopy[locale];
  const [id] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<"invalid" | "failed" | "conflict" | null>(
      null,
    );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || error === "conflict") return;
    const form = new FormData(e.currentTarget);
    const input: TaskInput = {
      assignee_id: canAssign
        ? String(form.get("assignee") ?? "") || null
        : (task?.assignee_id ?? null),
      title: String(form.get("title") ?? "").trim(),
      notes: String(form.get("notes") ?? ""),
      status: String(form.get("status")) as TaskInput["status"],
      start_date: String(form.get("start") ?? "") || null,
      due_date: String(form.get("due") ?? "") || null,
    };
    if (!validTask(input)) {
      setError("invalid");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = task
        ? await updateTask(task, input)
        : await createTask(org, project, id, input);
      if (!result) setError("conflict");
      else saved();
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <TaskEditorDialog
      initial={{
        title: task?.title ?? "",
        notes: task?.notes ?? "",
        status: (task?.status ?? "todo") as TaskInput["status"],
        start_date: task?.start_date ?? null,
        due_date: task?.due_date ?? null,
        assignee_id: task?.assignee_id ?? null,
      }}
      editing={!!task}
      busy={busy}
      error={error}
      submit={submit}
      close={close}
      reload={saved}
    >
      <label className="field" htmlFor="task-title">
        {c.title}
        <Input
          id="task-title"
          name="title"
          defaultValue={task?.title ?? ""}
          required
          maxLength={160}
        />
      </label>
      {canAssign && (
        <AssigneePicker org={org} value={task?.assignee_id ?? null} />
      )}
      <label className="field" htmlFor="task-status">
        {c.status}
        <select
          className="input"
          id="task-status"
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
      <label className="field" htmlFor="task-start">
        {c.start}
        <Input
          id="task-start"
          name="start"
          type="date"
          min="1900-01-01"
          max="2100-12-31"
          defaultValue={task?.start_date ?? ""}
        />
      </label>
      <label className="field" htmlFor="task-due">
        {c.due}
        <Input
          id="task-due"
          name="due"
          type="date"
          min="1900-01-01"
          max="2100-12-31"
          defaultValue={task?.due_date ?? ""}
        />
      </label>
      <label className="field task-notes-field" htmlFor="task-notes">
        {c.notes}
        <textarea
          className="input"
          id="task-notes"
          name="notes"
          maxLength={2000}
          rows={3}
          defaultValue={task?.notes ?? ""}
        />
      </label>
    </TaskEditorDialog>
  );
}
