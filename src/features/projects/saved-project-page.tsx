import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { ProjectEstimates } from "@/features/estimates/project-estimates";
import { ProjectFiles } from "@/features/files/project-files";
import { TaskPanel } from "@/features/tasks/task-panel";
import { useLocale } from "@/lib/i18n";
import { projectCopy } from "./project-copy";
import { ProjectFields } from "./project-fields";
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || busy) return;
    const values = new FormData(event.currentTarget);
    const input = {
      name: String(values.get("name") ?? "").trim(),
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
      <section className="connected-workspace">
        <Link className="back-link" to={`/workspace?company=${organizationId}`}>
          <ArrowLeft size={14} />
          {c.back}
        </Link>
        <PageHeader
          eyebrow={t("project")}
          title={!loading && !failed && project ? project.name : c.title}
          description={
            !loading && !failed && project
              ? `${project.client_name} · ${project.city}`
              : c.hint
          }
          action={
            project && !loading && !failed ? (
              <Button asChild>
                <a href="#project-estimates">
                  {t("allEstimates")}
                  <ArrowUpRight size={16} />
                </a>
              </Button>
            ) : undefined
          }
        />
        {project && !loading && !failed && (
          <>
            <div className="detail-status">
              <StatusBadge
                status={project.status as "planning" | "active" | "completed"}
              />
              <span>
                {locale === "fr" ? "Projet enregistré" : "Saved project"}
              </span>
            </div>
            <SavedProjectOverview project={project} />
            <nav className="detail-navigation" aria-label={c.title}>
              <a href="#site-details">{c.title}</a>
              <a href="#project-tasks">
                {locale === "fr" ? "Tâches" : "Tasks"}
              </a>
              <Link to={`/workspace/${organizationId}/schedule`}>
                {locale === "fr" ? "Planning" : "Schedule"}
              </Link>
              <a href="#project-estimates">{t("estimates")}</a>
              <a href="#project-files">
                {locale === "fr" ? "Fichiers" : "Files"}
              </a>
            </nav>
          </>
        )}
        {loading ? (
          <p role="status">{shared.loading}</p>
        ) : failed ? (
          <>
            <p role="alert">{c.error}</p>
            <Button onClick={() => setReload((n) => n + 1)}>{c.retry}</Button>
          </>
        ) : !project ? (
          <p role="alert">{c.missing}</p>
        ) : (
          <form
            id="site-details"
            className="company-form"
            key={`${project.revision}:${reload}`}
            onSubmit={submit}
          >
            <h2 className="site-edit-heading">{c.title}</h2>
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
        )}
        {project && !loading && !failed && (
          <>
            <TaskPanel org={organizationId} project={id} />
            <ProjectEstimates organizationId={organizationId} projectId={id} />
            <ProjectFiles organizationId={organizationId} projectId={id} />
          </>
        )}
      </section>
    </AppShell>
  );
}
