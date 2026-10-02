import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { EmptyState, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Project, ProjectStatus } from "@/features/projects/data";
import {
  layoutCopy,
  ProjectNavigation,
  type ProjectTab,
  projectTabs,
} from "@/features/projects/project-layout";
import { taskCopy } from "@/features/tasks/task-copy";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { DemoCosts } from "./demo-costs";
import { DemoProjectEstimates } from "./demo-estimates";
import { DemoFiles } from "./demo-files";
import { DemoJournal } from "./demo-journal";
import { DemoOverview } from "./demo-overview";
import { DemoSketchDialog, DemoSketches } from "./demo-sketches";
import { DemoTaskPanel } from "./demo-tasks";
import type { DemoSketch } from "./demo-types";

const hashTabs: Record<string, ProjectTab> = {
  "#project-costs": "budget",
  "#project-tasks": "tasks",
  "#project-estimates": "estimates",
  "#project-files": "documents",
  "#project-sketches": "documents",
};

export function DemoProjectPage() {
  const { id } = useParams();
  const { projects } = useDemo();
  const { t } = useLocale();
  const d = useDemoCopy();
  const project = projects.find((p) => p.id === id);
  if (!project)
    return (
      <EmptyState
        title={d.notFound}
        description=""
        action={
          <Button asChild>
            <Link to="/projects">{t("home")}</Link>
          </Button>
        }
      />
    );
  return <DemoProjectDetail key={project.id} project={project} />;
}

function DemoProjectDetail({ project }: { project: Project }) {
  const { locale, t } = useLocale(),
    l = layoutCopy[locale];
  const location = useLocation(),
    [search] = useSearchParams();
  const requested = hashTabs[location.hash] ?? search.get("tab") ?? "overview";
  const active = projectTabs.includes(requested as ProjectTab)
    ? (requested as ProjectTab)
    : "overview";
  const [editing, setEditing] = useState(false),
    [sketch, setSketch] = useState<DemoSketch | null>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    if (location.hash)
      document
        .getElementById(location.hash.slice(1))
        ?.scrollIntoView({ block: "start" });
  }, [location.hash]);
  return (
    <>
      <section className="connected-workspace project-detail-workspace">
        <header className="project-header">
          <Link className="back-link" to="/projects">
            {l.back}
          </Link>
          <div className="project-heading-row">
            <div>
              <div className="project-heading-title">
                <h1>{project.name}</h1>
                <StatusBadge status={project.status} />
              </div>
              <p>
                {project.client} · {project.address}
              </p>
            </div>
            <div className="task-actions">
              <Button asChild variant="ghost">
                <Link to="?tab=estimates">{t("allEstimates")}</Link>
              </Button>
              <Button variant="outline" onClick={() => setEditing(true)}>
                {l.edit}
              </Button>
            </div>
          </div>
        </header>
        <ProjectNavigation active={active} owner />
        <section
          className="project-panel"
          ref={panel}
          tabIndex={-1}
          aria-label={l[active]}
        >
          {active === "overview" && (
            <DemoOverview projectId={project.id} openSketch={setSketch} />
          )}
          {active === "tasks" && (
            <>
              <Link className="account-link" to="/schedule">
                {l.schedule}
              </Link>
              <DemoTaskPanel projectId={project.id} />
            </>
          )}
          {active === "budget" && <DemoCosts projectId={project.id} />}
          {active === "estimates" && (
            <DemoProjectEstimates projectId={project.id} />
          )}
          {active === "documents" && (
            <div className="project-documents">
              <DemoFiles projectId={project.id} />
              <DemoSketches projectId={project.id} open={setSketch} />
            </div>
          )}
          {active === "activity" && <DemoJournal projectId={project.id} />}
        </section>
        {editing && (
          <ProjectEditor project={project} close={() => setEditing(false)} />
        )}
      </section>
      {sketch && (
        <DemoSketchDialog sketch={sketch} close={() => setSketch(null)} />
      )}
    </>
  );
}

function ProjectEditor({
  project,
  close,
}: {
  project: Project;
  close: () => void;
}) {
  const { locale, t } = useLocale(),
    l = layoutCopy[locale],
    tc = taskCopy[locale];
  const { saveProject } = useDemo();
  const [invalid, setInvalid] = useState(false);
  const title = locale === "fr" ? "Détails du projet" : "Project details";
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const next = {
      ...project,
      name: value("name"),
      client: value("client"),
      city: value("city"),
      address: value("address") || value("city"),
      status: value("status") as ProjectStatus,
    };
    if (!next.name || !next.client || !next.city) {
      setInvalid(true);
      return;
    }
    saveProject(next);
    close();
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        title={title}
        description={
          locale === "fr"
            ? "Coordonnées du chantier et état d’avancement."
            : "Site details and project status."
        }
        closeLabel={l.close}
      >
        <form className="company-form" onSubmit={submit}>
          <fieldset className="project-fields">
            {(
              [
                ["name", t("projectName"), project.name],
                ["client", t("client"), project.client],
                ["city", t("city"), project.city],
                ["address", t("address"), project.address],
              ] as const
            ).map(([key, label, value]) => (
              <label
                className="field"
                htmlFor={`demo-project-${key}`}
                key={key}
              >
                {label}
                <Input
                  id={`demo-project-${key}`}
                  name={key}
                  defaultValue={value}
                  maxLength={key === "address" ? 300 : 120}
                  required={key !== "address"}
                />
              </label>
            ))}
            <label className="field" htmlFor="demo-project-status">
              {t("status")}
              <select
                className="input"
                id="demo-project-status"
                name="status"
                defaultValue={project.status}
              >
                {(["planning", "active", "completed"] as const).map((s) => (
                  <option key={s} value={s}>
                    {t(s)}
                  </option>
                ))}
              </select>
            </label>
            <div className="dialog-actions">
              <Button type="button" variant="outline" onClick={close}>
                {tc.cancel}
              </Button>
              <Button>
                {locale === "fr"
                  ? "Enregistrer les modifications"
                  : "Save changes"}
              </Button>
            </div>
          </fieldset>
          {invalid && (
            <p role="alert" className="error-message">
              {t("required")}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
