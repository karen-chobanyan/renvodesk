import { Plus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AssigneePicker } from "@/features/team/assignee-picker";
import { useCompanyAccess } from "@/features/team/company-access";
import { teamCopy } from "@/features/team/team-copy";
import { listTeam, type TeamMember } from "@/features/team/team-service";
import { useLocale } from "@/lib/i18n";
import { taskCopy } from "./task-copy";
import {
  addDays,
  dateLabel,
  onDay,
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
  org,
  project,
  filter = {},
}: {
  org: string;
  project?: string;
  filter?: TaskFilter;
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
  }, [org, project, mode, start, filterToday, assignee, reload]);
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
  function taskItem(row: (typeof rows)[number]) {
    return (
      <article className="task-row" key={row.id}>
        <div className="task-content">
          <strong>{row.title}</strong>
          {!project && (
            <Link
              className="account-link"
              to={`/workspace/${org}/projects/${row.project_id}#project-tasks`}
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
          {row.notes && <p className="task-notes">{row.notes}</p>}
          <small>
            {row.start_date ? dateLabel(row.start_date, locale) : c.noDate} →{" "}
            {row.due_date ? dateLabel(row.due_date, locale) : c.noDate}
          </small>
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
      <div className="section-heading">
        <div>
          <h2>{project ? c.tasks : c.schedule}</h2>
          {project && <p className="page-description">{c.hint}</p>}
        </div>
        <div className="task-actions">
          <Button variant="outline" disabled={loading} onClick={refresh}>
            {c.refresh}
          </Button>
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
      {loading && <p role="status">{c.loading}</p>}
      {failed ? (
        <div role="alert">
          <p>{c.error}</p>
          <Button onClick={refresh}>{c.retry}</Button>
        </div>
      ) : (
        <>
          {!loading && rows.length === 0 && (
            <p className="workspace-loading">{c.empty}</p>
          )}
          {mode === "week" && start ? (
            <div className="week-grid">
              {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map(
                (date) => (
                  <section
                    key={date}
                    className={date === day ? "week-day is-today" : "week-day"}
                  >
                    <h3>
                      {new Intl.DateTimeFormat(locale, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      }).format(new Date(`${date}T12:00:00Z`))}
                    </h3>
                    {rows.filter((row) => onDay(row, date)).map(taskItem)}
                  </section>
                ),
              )}
            </div>
          ) : (
            <div className="task-list">{rows.map(taskItem)}</div>
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
    if (busy) return;
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
    <form className="company-form task-editor" onSubmit={submit}>
      <fieldset disabled={busy} className="project-fields">
        {canAssign && (
          <AssigneePicker org={org} value={task?.assignee_id ?? null} />
        )}
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
        <p className="helper-text">{c.datesHint}</p>
        <div className="dialog-actions">
          <Button type="button" variant="outline" onClick={close}>
            {c.cancel}
          </Button>
          <Button disabled={error === "conflict"}>
            {busy ? c.loading : c.save}
          </Button>
        </div>
      </fieldset>
      {error && (
        <div role="alert">
          <p>{c[error]}</p>
          {error === "conflict" && (
            <Button type="button" onClick={saved}>
              {c.reload}
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
