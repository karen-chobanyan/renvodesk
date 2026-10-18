import type { ReactNode } from "react";
import { Link } from "react-router";
import { costCopy } from "@/features/costs/cost-copy";
import { CostMetrics } from "@/features/costs/cost-summary";
import { workflowCopy } from "@/features/estimates/workflow-copy";
import { projectDetailCopy } from "@/features/projects/project-detail-copy";
import { layoutCopy } from "@/features/projects/project-layout";
import {
  ProjectPreview,
  ProjectPreviewEmpty,
} from "@/features/projects/project-overview-layout";
import { dateLabel } from "@/features/tasks/task-model";
import { useDemo } from "@/lib/demo-store";
import { formatMoney, useLocale } from "@/lib/i18n";
import { useDemoSummary } from "./demo-costs";
import { demoEstimateTotal } from "./demo-estimate-model";
import { DemoJournal } from "./demo-journal";
import { SketchThumbnail } from "./demo-sketches";
import { useAssigneeName } from "./demo-tasks";
import { type DemoSketch, say } from "./demo-types";

function Preview({
  title,
  empty,
  to,
  children,
  emptyAction,
  emptyTo,
}: {
  title: string;
  empty: string;
  to: string;
  children: ReactNode[];
  emptyAction: string;
  emptyTo?: string;
}) {
  return (
    <ProjectPreview title={title} to={to}>
      {children.length ? (
        children
      ) : (
        <ProjectPreviewEmpty
          text={empty}
          action={emptyAction}
          to={emptyTo ?? to}
        />
      )}
    </ProjectPreview>
  );
}

export function DemoOverview({
  projectId,
  openSketch,
}: {
  projectId: string;
  openSketch: (sketch: DemoSketch) => void;
}) {
  const { locale } = useLocale(),
    c = layoutCopy[locale],
    d = projectDetailCopy[locale];
  const { tasks, estimates, sketches, files, base } = useDemo();
  const summary = useDemoSummary(projectId);
  const assignee = useAssigneeName();
  const open = tasks
    .filter((t) => t.projectId === projectId && t.status !== "done")
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
    .slice(0, 4);
  const statusLabel = (status: string) =>
    locale === "fr"
      ? status === "in_progress"
        ? "En cours"
        : "À faire"
      : status === "in_progress"
        ? "In progress"
        : "To do";
  return (
    <div className="project-overview-grid">
      <div>
        <Preview
          title={c.next}
          empty={c.emptyTasks}
          to="?tab=tasks"
          emptyAction={d.newTask}
          emptyTo="?tab=tasks&new=task"
        >
          {open.map((task) => {
            const late = !!task.due && task.due < base;
            return (
              <Link
                className="project-preview-row"
                to={`?tab=tasks&task=${task.id}`}
                key={task.id}
              >
                <span>
                  <strong>{say(task.title, locale)}</strong>
                  <small>
                    {task.due ? dateLabel(task.due, locale) : c.undated} ·{" "}
                    {assignee(task.assignee)}
                  </small>
                </span>
                <span className={late ? "status status-planning" : "status"}>
                  {late ? c.overdue : statusLabel(task.status)}
                </span>
              </Link>
            );
          })}
        </Preview>
        <section
          className="project-budget-preview"
          aria-label={costCopy[locale].title}
        >
          <h2>{costCopy[locale].title}</h2>
          <CostMetrics summary={summary} />
          <p className="helper-text">{costCopy[locale].notice}</p>
          <Link
            className="account-link"
            to={
              summary.budget_cents === null
                ? "?tab=budget&editBudget=1"
                : "?tab=budget"
            }
          >
            {summary.budget_cents === null ? d.setBudget : d.budget}
          </Link>
        </section>
        <Preview
          emptyAction={d.newEstimate}
          emptyTo="?tab=estimates&new=estimate"
          title={c.recent}
          empty={c.emptyEstimates}
          to="?tab=estimates"
        >
          {estimates
            .filter((e) => e.projectId === projectId)
            .slice(0, 3)
            .map((row) => (
              <Link
                className="project-preview-row"
                key={row.id}
                to={`/estimates/${row.id}`}
              >
                <span>
                  <strong>{say(row.title, locale)}</strong>
                  <small>{workflowCopy[locale][row.status]}</small>
                </span>
                <span>{formatMoney(demoEstimateTotal(row), locale)}</span>
              </Link>
            ))}
        </Preview>
        <Preview
          emptyAction={d.newSketch}
          emptyTo="?tab=documents&new=sketch#project-sketches"
          title={c.sketches}
          empty={c.emptySketches}
          to="?tab=documents#project-sketches"
        >
          {sketches
            .filter((s) => s.projectId === projectId)
            .slice(0, 2)
            .map((sk) => (
              <button
                className="project-preview-row project-sketch-preview-open"
                key={sk.id}
                type="button"
                onClick={() => openSketch(sk)}
              >
                <SketchThumbnail scene={sk.scene} />
                <span>
                  <strong>{say(sk.title, locale)}</strong>
                  <small>
                    {locale === "fr" ? "Ouvrir le croquis" : "Open sketch"}
                  </small>
                </span>
              </button>
            ))}
        </Preview>
        <Preview
          emptyAction={d.addFiles}
          title={c.files}
          empty={c.emptyFiles}
          to="?tab=documents#project-files"
        >
          {files
            .filter((f) => f.projectId === projectId)
            .slice(0, 3)
            .map((f) => (
              <Link
                className="project-preview-row"
                key={f.id}
                to={`?tab=documents&file=${f.id}#project-files`}
              >
                <strong>{f.name}</strong>
              </Link>
            ))}
        </Preview>
      </div>
      <aside className="project-context">
        <DemoJournal projectId={projectId} compact />
        <Link className="account-link" to="?tab=activity">
          {d.activity}
        </Link>
      </aside>
    </div>
  );
}
