import {
  type InfiniteData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { Button } from "@/components/ui/button";
import { ProjectJournal } from "@/features/activity/project-journal";
import { useAuth } from "@/features/auth/auth-provider";
import { ProjectCosts } from "@/features/costs/project-costs";
import { ProjectEstimates } from "@/features/estimates/project-estimates";
import { ProjectFiles } from "@/features/files/project-files";
import { workspaceKeys } from "@/features/organizations/workspace-context";
import { ProjectSketches } from "@/features/sketches/project-sketches";
import { SketchModal } from "@/features/sketches/sketch-modal";
import { TaskPanel } from "@/features/tasks/task-panel";
import { useCompanyAccess } from "@/features/team/company-access";
import { useLocale } from "@/lib/i18n";
import { ProjectDetailsEditor } from "./project-details-editor";
import {
  layoutCopy,
  ProjectHeader,
  ProjectNavigation,
  ProjectSkeleton,
  type ProjectTab,
  projectTabs,
} from "./project-layout";
import {
  getProject,
  type SavedProject,
  updateProject,
} from "./project-service";
import { SavedProjectOverview } from "./saved-project-overview";

const copy = {
  fr: {
    title: "Détails du projet",
    missing: "Projet introuvable ou accès indisponible.",
    error: "Impossible de charger le projet.",
    retry: "Réessayer",
  },
  en: {
    title: "Project details",
    missing: "Project not found or access unavailable.",
    error: "Could not load the project.",
    retry: "Try again",
  },
};
export function SavedProjectPage() {
  const { organizationId = "", id = "" } = useParams();
  const { session } = useAuth();
  return (
    <ProjectDetail
      key={`${session?.user.id}:${organizationId}:${id}`}
      organizationId={organizationId}
      id={id}
    />
  );
}
function ProjectDetail({
  organizationId,
  id,
}: {
  organizationId: string;
  id: string;
}) {
  const { locale } = useLocale(),
    c = copy[locale];
  const {
    owner,
    role,
    loading: accessLoading,
  } = useCompanyAccess(organizationId);
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const client = useQueryClient();
  const projectQuery = useQuery({
    queryKey: workspaceKeys.project(userId, organizationId, id),
    queryFn: () => getProject(organizationId, id),
    enabled: !!userId && !!organizationId && !!id,
    initialData: () =>
      client
        .getQueryData<InfiniteData<SavedProject[], number>>(
          workspaceKeys.projects(userId, organizationId),
        )
        ?.pages.flat()
        .find((row) => row.id === id),
    initialDataUpdatedAt: () =>
      client.getQueryState(workspaceKeys.projects(userId, organizationId))
        ?.dataUpdatedAt,
  });
  const project = projectQuery.data ?? null;
  const loading = projectQuery.isPending && projectQuery.isFetching;
  const failed = projectQuery.isError && !project;
  function refreshProject() {
    void projectQuery.refetch();
  }
  function cacheProject(updated: SavedProject) {
    client.setQueryData(
      workspaceKeys.project(userId, organizationId, id),
      updated,
    );
    client.setQueryData<InfiniteData<SavedProject[], number>>(
      workspaceKeys.projects(userId, organizationId),
      (old) =>
        old && {
          ...old,
          pages: old.pages.map((page) =>
            page.map((row) => (row.id === id ? updated : row)),
          ),
        },
    );
  }
  const location = useLocation(),
    navigate = useNavigate(),
    [search] = useSearchParams(),
    l = layoutCopy[locale];
  const hashTabs: Record<string, ProjectTab> = {
    "#project-costs": "budget",
    "#project-tasks": "tasks",
    "#project-estimates": "estimates",
    "#project-files": "documents",
    "#project-sketches": "documents",
  };
  const requested = hashTabs[location.hash] ?? search.get("tab") ?? "overview";
  const active: ProjectTab =
    projectTabs.includes(requested as ProjectTab) &&
    (owner || !["budget", "estimates"].includes(requested))
      ? (requested as ProjectTab)
      : "overview";
  const [visited, setVisited] = useState<Set<ProjectTab>>(() => new Set()),
    [editing, setEditing] = useState<SavedProject | null>(null);
  const [overviewRefresh, setOverviewRefresh] = useState(0);
  const refreshOverview = useCallback(
    () => setOverviewRefresh((n) => n + 1),
    [],
  );
  const [sketchId, setSketchId] = useState<string | null>(null);
  const [sketchRefresh, setSketchRefresh] = useState(0);
  const [taskRefresh, setTaskRefresh] = useState(0);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    setVisited((old) => new Set([...old, active]));
    panel.current?.focus({ preventScroll: true });
  }, [active]);
  useEffect(() => {
    if (location.hash === "#site-details" && owner && project)
      setEditing((current) => current ?? project);
  }, [location.hash, owner, project]);
  function closeEdit() {
    setEditing(null);
    requestAnimationFrame(() =>
      document.getElementById("project-edit-details")?.focus(),
    );
    if (location.hash === "#site-details")
      void navigate({ search: location.search, hash: "" }, { replace: true });
  }
  return (
    <>
      <section className="connected-workspace project-detail-workspace">
        {project ? (
          <ProjectHeader
            project={project}
            owner={owner}
            edit={() => setEditing(project)}
          />
        ) : (
          <>
            <Link
              className="back-link"
              to={`/workspace?company=${organizationId}`}
            >
              {l.back}
            </Link>
            <h1>{c.title}</h1>
          </>
        )}
        {project && !accessLoading && role && (
          <ProjectNavigation active={active} owner={owner} />
        )}
        {projectQuery.isError && project && (
          <p role="alert" className="error-message">
            {c.error}{" "}
            <Button
              variant="ghost"
              disabled={projectQuery.isFetching}
              onClick={refreshProject}
            >
              {c.retry}
            </Button>
          </p>
        )}
        {failed ? (
          <div role="alert">
            <p>{c.error}</p>
            <Button onClick={refreshProject}>{c.retry}</Button>
          </div>
        ) : !project ? (
          loading ? (
            <ProjectSkeleton />
          ) : (
            <p role="alert">{c.missing}</p>
          )
        ) : accessLoading ? (
          <ProjectSkeleton />
        ) : !role ? (
          <p role="alert">{c.missing}</p>
        ) : (
          <>
            <section
              className="project-panel"
              ref={panel}
              tabIndex={-1}
              aria-label={l[active]}
            >
              {active === "activity" && (
                <ProjectJournal
                  key={`${sketchRefresh}:${overviewRefresh}:${taskRefresh}`}
                  org={organizationId}
                  project={id}
                  owner={owner}
                  revision={project.revision}
                  onOpenSketch={setSketchId}
                />
              )}
              {(visited.has("overview") || active === "overview") && (
                <div hidden={active !== "overview"}>
                  <SavedProjectOverview
                    key={`${project.revision}:${sketchRefresh}:${taskRefresh}:${overviewRefresh}`}
                    project={project}
                    owner={owner}
                    onOpenSketch={setSketchId}
                  />
                </div>
              )}
              {(visited.has("tasks") || active === "tasks") && (
                <div hidden={active !== "tasks"}>
                  <TaskPanel
                    active={active === "tasks"}
                    org={organizationId}
                    project={id}
                    refreshKey={taskRefresh}
                    onChanged={refreshOverview}
                    scheduleHref={`/workspace/${organizationId}/schedule`}
                  />
                </div>
              )}
              {owner && (visited.has("budget") || active === "budget") && (
                <div hidden={active !== "budget"}>
                  <ProjectCosts
                    org={organizationId}
                    project={id}
                    onChanged={refreshOverview}
                  />
                </div>
              )}
              {owner &&
                (visited.has("estimates") || active === "estimates") && (
                  <div hidden={active !== "estimates"}>
                    <ProjectEstimates
                      organizationId={organizationId}
                      projectId={id}
                      projectName={project.name}
                      clientName={project.client_name}
                    />
                  </div>
                )}
              {(visited.has("documents") || active === "documents") && (
                <div
                  hidden={active !== "documents"}
                  className="project-documents"
                >
                  <ProjectFiles
                    organizationId={organizationId}
                    projectId={id}
                    canManage={owner}
                    onTaskCreated={() => setTaskRefresh((n) => n + 1)}
                    onChanged={refreshOverview}
                  />
                  <ProjectSketches
                    org={organizationId}
                    project={id}
                    owner={owner}
                    onOpenSketch={setSketchId}
                    refreshKey={sketchRefresh}
                  />
                </div>
              )}
            </section>
            {owner && editing && (
              <ProjectDetailsEditor
                initial={editing}
                close={closeEdit}
                save={async (base, input) => {
                  const updated = await updateProject(base, input);
                  if (updated) cacheProject(updated);
                  return updated;
                }}
                reload={async () => {
                  const updated = await getProject(organizationId, id);
                  if (updated) cacheProject(updated);
                  return updated;
                }}
              />
            )}
          </>
        )}
      </section>
      {sketchId && (
        <SketchModal
          key={sketchId}
          org={organizationId}
          project={id}
          id={sketchId}
          onClose={() => {
            setSketchId(null);
            setSketchRefresh((value) => value + 1);
          }}
        />
      )}
    </>
  );
}
