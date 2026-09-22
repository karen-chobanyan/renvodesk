import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { ProjectCosts } from "@/features/costs/project-costs";
import { ProjectEstimates } from "@/features/estimates/project-estimates";
import { ProjectFiles } from "@/features/files/project-files";
import { ProjectSketches } from "@/features/sketches/project-sketches";
import { TaskPanel } from "@/features/tasks/task-panel";
import { useCompanyAccess } from "@/features/team/company-access";
import { useLocale } from "@/lib/i18n";
import { projectCopy } from "./project-copy";
import { ProjectFields } from "./project-fields";
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
    back: "Retour aux entreprises",
    title: "Détails du projet",
    save: "Enregistrer les modifications",
    status: "Statut",
    missing: "Projet introuvable ou accès indisponible.",
    error: "Impossible de charger le projet.",
    retry: "Réessayer",
    failed:
      "Enregistrement non confirmé. Vos champs sont conservés. Réessayez ou rechargez pour vérifier la version enregistrée.",
    conflict:
      "Le projet a changé ou votre accès a été retiré. Vos champs sont conservés. Rechargez la version enregistrée avant de modifier à nouveau.",
    reload: "Recharger et remplacer mes champs",
    saved: "Modifications enregistrées.",
    hint: "Coordonnées du chantier et état d’avancement.",
  },
  en: {
    back: "Back to companies",
    title: "Project details",
    save: "Save changes",
    status: "Status",
    missing: "Project not found or access unavailable.",
    error: "Could not load the project.",
    retry: "Try again",
    failed:
      "Save not confirmed. Your fields are preserved. Retry or reload to check the saved version.",
    conflict:
      "The project changed or your access was removed. Your fields are preserved. Reload the saved version before editing again.",
    reload: "Reload and replace my fields",
    saved: "Changes saved.",
    hint: "Site details and project status.",
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
  const { locale, t } = useLocale(),
    c = copy[locale],
    shared = projectCopy[locale];
  const {
    owner,
    role,
    loading: accessLoading,
  } = useCompanyAccess(organizationId);
  const [project, setProject] = useState<SavedProject | null>(null);
  const [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<"failed" | "conflict" | null>(null),
    [saved, setSaved] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit reload retries the project query
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void getProject(organizationId, id)
      .then((data) => {
        if (active) {
          setProject(data);
          setError(null);
          setSaved(false);
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
  }, [organizationId, id, reload]);
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
    [editing, setEditing] = useState(false);
  const editDirty = useRef(false),
    panel = useRef<HTMLElement>(null);
  useEffect(() => {
    setVisited((old) => new Set([...old, active]));
    panel.current?.focus({ preventScroll: true });
  }, [active]);
  useEffect(() => {
    if (location.hash === "#site-details" && owner) setEditing(true);
  }, [location.hash, owner]);
  function closeEdit(open: boolean) {
    if (!open && (busy || (editDirty.current && !window.confirm(l.leave))))
      return;
    setEditing(open);
    if (!open) {
      editDirty.current = false;
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>(".project-header button")
          ?.focus(),
      );
      if (location.hash === "#site-details")
        void navigate({ search: location.search, hash: "" }, { replace: true });
    }
  }
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (editDirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || busy) return;
    const values = new FormData(event.currentTarget);
    const input = {
      name: String(values.get("project_name") ?? "").trim(),
      client_name: String(values.get("client_name") ?? "").trim(),
      city: String(values.get("city") ?? "").trim(),
      address: String(values.get("address") ?? "").trim(),
      status: String(values.get("status") ?? ""),
    };
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateProject(project, input);
      if (updated) {
        setProject(updated);
        editDirty.current = false;
        setSaved(true);
      } else setError("conflict");
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell live>
      <section className="connected-workspace project-detail-workspace">
        {project ? (
          <ProjectHeader
            project={project}
            owner={owner}
            edit={() => setEditing(true)}
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
        {failed ? (
          <div role="alert">
            <p>{c.error}</p>
            <Button onClick={() => setReload((n) => n + 1)}>{c.retry}</Button>
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
              {active === "overview" && (
                <SavedProjectOverview
                  key={project.revision}
                  project={project}
                  owner={owner}
                  edit={() => setEditing(true)}
                />
              )}
              {(visited.has("tasks") || active === "tasks") && (
                <div hidden={active !== "tasks"}>
                  <Link
                    className="account-link"
                    to={`/workspace/${organizationId}/schedule`}
                  >
                    {l.schedule}
                  </Link>
                  <TaskPanel org={organizationId} project={id} />
                </div>
              )}
              {owner && (visited.has("budget") || active === "budget") && (
                <div hidden={active !== "budget"}>
                  <ProjectCosts org={organizationId} project={id} />
                </div>
              )}
              {owner &&
                (visited.has("estimates") || active === "estimates") && (
                  <div hidden={active !== "estimates"}>
                    <ProjectEstimates
                      organizationId={organizationId}
                      projectId={id}
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
                  />
                  <ProjectSketches
                    org={organizationId}
                    project={id}
                    owner={owner}
                  />
                </div>
              )}
            </section>
            {owner && (
              <Dialog open={editing} onOpenChange={closeEdit}>
                <DialogContent
                  title={c.title}
                  description={c.hint}
                  closeLabel={l.close}
                >
                  <form
                    id="site-details"
                    className="company-form"
                    key={`${project.revision}:${reload}`}
                    onSubmit={submit}
                    onChange={() => {
                      editDirty.current = true;
                    }}
                  >
                    <fieldset className="project-fields" disabled={busy}>
                      <ProjectFields values={project} />
                      <div className="field">
                        <label htmlFor="project-status">{c.status}</label>
                        <select
                          className="input"
                          id="project-status"
                          name="status"
                          defaultValue={project.status}
                        >
                          {(["planning", "active", "completed"] as const).map(
                            (status) => (
                              <option key={status} value={status}>
                                {t(status)}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <div className="dialog-actions">
                        <Button type="submit" disabled={error === "conflict"}>
                          {busy ? shared.loading : c.save}
                        </Button>
                      </div>
                    </fieldset>
                    {error && (
                      <div role="alert">
                        <p className="error-message">{c[error]}</p>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setReload((n) => n + 1)}
                        >
                          {c.reload}
                        </Button>
                      </div>
                    )}
                    {saved && <p role="status">{c.saved}</p>}
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </section>
    </AppShell>
  );
}
