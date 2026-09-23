import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ProjectJournal } from "@/features/activity/project-journal";
import { CostSummary } from "@/features/costs/cost-summary";
import { listEstimates } from "@/features/estimates/estimate-service";
import {
  estimateStatus,
  workflowCopy,
} from "@/features/estimates/workflow-copy";
import { recentFiles } from "@/features/files/file-service";
import { SketchPreview } from "@/features/sketches/project-sketches";
import { listSketches } from "@/features/sketches/sketch-service";
import { dateLabel, today } from "@/features/tasks/task-model";
import { nextProjectTasks } from "@/features/tasks/task-service";
import { listTeam } from "@/features/team/team-service";
import { formatMoney, useLocale } from "@/lib/i18n";
import { layoutCopy, ProjectSkeleton } from "./project-layout";
import type { SavedProject } from "./project-service";

function Preview({
  title,
  empty,
  to,
  load,
}: {
  title: string;
  empty: string;
  to: string;
  load: () => Promise<ReactNode[]>;
}) {
  const { locale } = useLocale(),
    c = layoutCopy[locale];
  const [rows, setRows] = useState<ReactNode[] | null>(null),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: parent remounts overview after navigation; locale or retry refreshes its bounded preview
  useEffect(() => {
    let active = true;
    setFailed(false);
    setRows(null);
    void load()
      .then((r) => {
        if (active) setRows(r);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [locale, retry]);
  return (
    <section className="project-preview">
      <div className="section-heading">
        <h2>{title}</h2>
        <Link className="account-link" to={to}>
          {c.view}
        </Link>
      </div>
      {failed ? (
        <div role="alert">
          <p>{c.error}</p>
          <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
            {c.retry}
          </Button>
        </div>
      ) : rows === null ? (
        <ProjectSkeleton />
      ) : rows.length ? (
        rows
      ) : (
        <p className="project-empty">{empty}</p>
      )}
    </section>
  );
}
export function SavedProjectOverview({
  project,
  owner,
  onOpenSketch,
}: {
  project: SavedProject;
  owner: boolean;
  onOpenSketch: (id: string) => void;
}) {
  const { locale } = useLocale(),
    c = layoutCopy[locale],
    org = project.organization_id,
    id = project.id,
    base = `/workspace/${org}/projects/${id}`;
  return (
    <>
      {owner && <CostSummary org={org} project={id} />}
      <div className="project-overview-grid">
        <div>
          <Preview
            title={c.next}
            empty={c.emptyTasks}
            to="?tab=tasks"
            load={async () => {
              const [rows, people] = await Promise.all([
                nextProjectTasks(org, id),
                listTeam(org).catch(() => []),
              ]);
              return rows.map((task) => (
                <Link
                  className="project-preview-row"
                  to="?tab=tasks"
                  key={task.id}
                >
                  <span>
                    <strong>{task.title}</strong>
                    <small>
                      {task.due_date
                        ? dateLabel(task.due_date, locale)
                        : c.undated}{" "}
                      ·{" "}
                      {task.assignee_id
                        ? (people.find((p) => p.user_id === task.assignee_id)
                            ?.email ??
                          (locale === "fr"
                            ? "Responsable attribué"
                            : "Assigned"))
                        : locale === "fr"
                          ? "Non attribuée"
                          : "Unassigned"}
                    </small>
                  </span>
                  <span
                    className={
                      task.due_date && task.due_date < today()
                        ? "status status-planning"
                        : "status"
                    }
                  >
                    {task.due_date && task.due_date < today()
                      ? c.overdue
                      : locale === "fr"
                        ? task.status === "in_progress"
                          ? "En cours"
                          : "À faire"
                        : task.status === "in_progress"
                          ? "In progress"
                          : "To do"}
                  </span>
                </Link>
              ));
            }}
          />
          {owner && (
            <Preview
              title={c.recent}
              empty={c.emptyEstimates}
              to="?tab=estimates"
              load={async () => {
                const rows = await listEstimates(org, id);
                return rows.slice(0, 3).map((row) => (
                  <Link
                    className="project-preview-row"
                    key={row.id}
                    to={`${base}/estimates/${row.id}`}
                  >
                    <span>
                      <strong>{row.title}</strong>
                      <small>
                        {workflowCopy[locale][estimateStatus(row.status)]}
                      </small>
                    </span>
                    <span>{formatMoney(row.total_cents, locale)}</span>
                  </Link>
                ));
              }}
            />
          )}
          <Preview
            title={c.sketches}
            empty={c.emptySketches}
            to="?tab=documents#project-sketches"
            load={async () => {
              const rows = await listSketches(org, id);
              return rows.slice(0, 2).map((sk) => (
                <button
                  className="project-preview-row project-sketch-preview-open"
                  key={sk.id}
                  type="button"
                  onClick={() => onOpenSketch(sk.id)}
                >
                  <SketchPreview sk={sk} />
                  <span>
                    <strong>{sk.title}</strong>
                    <small>
                      {locale === "fr" ? "Ouvrir le croquis" : "Open sketch"}
                    </small>
                  </span>
                </button>
              ));
            }}
          />
          <Preview
            title={c.files}
            empty={c.emptyFiles}
            to="?tab=documents#project-files"
            load={async () => {
              const rows = await recentFiles(org, id);
              return rows
                .filter((f) => f.state === "ready")
                .slice(0, 3)
                .map((f) => (
                  <Link
                    className="project-preview-row"
                    key={f.id}
                    to="?tab=documents#project-files"
                  >
                    <strong>{f.original_name}</strong>
                  </Link>
                ));
            }}
          />
        </div>
        <aside className="project-context">
          <ProjectJournal
            org={org}
            project={id}
            owner={owner}
            compact
            revision={project.revision}
            onOpenSketch={onOpenSketch}
          />
        </aside>
      </div>
    </>
  );
}
