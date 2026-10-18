import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { Project, ProjectStatus } from "@/features/projects/data";
import { ProjectDetailsEditor } from "@/features/projects/project-details-editor";
import {
  layoutCopy,
  ProjectHeader,
  ProjectNavigation,
  type ProjectTab,
  projectTabs,
} from "@/features/projects/project-layout";
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
  const { saveProject } = useDemo();
  const { locale } = useLocale(),
    l = layoutCopy[locale];
  const location = useLocation(),
    [search] = useSearchParams();
  const requested = hashTabs[location.hash] ?? search.get("tab") ?? "overview";
  const active = projectTabs.includes(requested as ProjectTab)
    ? (requested as ProjectTab)
    : "overview";
  const [visited, setVisited] = useState<Set<ProjectTab>>(() => new Set());
  useEffect(() => {
    setVisited((old) => new Set([...old, active]));
  }, [active]);
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
        <ProjectHeader
          project={{ ...project, client_name: project.client }}
          owner
          backHref="/projects"
          edit={() => setEditing(true)}
        />
        <ProjectNavigation active={active} owner />
        <section
          className="project-panel"
          ref={panel}
          tabIndex={-1}
          aria-label={l[active]}
        >
          {(active === "overview" || visited.has("overview")) && (
            <div hidden={active !== "overview"}>
              <DemoOverview projectId={project.id} openSketch={setSketch} />
            </div>
          )}
          {(active === "tasks" || visited.has("tasks")) && (
            <div hidden={active !== "tasks"}>
              <DemoTaskPanel
                active={active === "tasks"}
                projectId={project.id}
                scheduleHref="/schedule"
              />
            </div>
          )}
          {(active === "budget" || visited.has("budget")) && (
            <div hidden={active !== "budget"}>
              <DemoCosts projectId={project.id} active={active === "budget"} />
            </div>
          )}
          {(active === "estimates" || visited.has("estimates")) && (
            <div hidden={active !== "estimates"}>
              <DemoProjectEstimates projectId={project.id} />
            </div>
          )}
          {(active === "documents" || visited.has("documents")) && (
            <div hidden={active !== "documents"}>
              <div className="project-documents">
                <DemoFiles projectId={project.id} />
                <DemoSketches projectId={project.id} open={setSketch} />
              </div>
            </div>
          )}
          {active === "activity" && <DemoJournal projectId={project.id} />}
        </section>
        {editing && (
          <ProjectDetailsEditor
            initial={{ ...project, client_name: project.client, revision: 0 }}
            close={() => {
              setEditing(false);
              requestAnimationFrame(() =>
                document.getElementById("project-edit-details")?.focus(),
              );
            }}
            save={async (base, input) => {
              const next = {
                ...base,
                ...input,
                client: input.client_name,
                address: input.address ?? "",
                status: input.status as ProjectStatus,
              };
              saveProject(next);
              return next;
            }}
          />
        )}
      </section>
      {sketch && (
        <DemoSketchDialog sketch={sketch} close={() => setSketch(null)} />
      )}
    </>
  );
}
