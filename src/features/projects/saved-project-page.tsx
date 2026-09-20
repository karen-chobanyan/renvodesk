import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/features/auth/auth-page";
import { useAuth } from "@/features/auth/auth-provider";
import { useLocale } from "@/lib/i18n";
import { projectCopy } from "./project-copy";
import { ProjectFields } from "./project-fields";
import {
  getProject,
  type SavedProject,
  updateProject,
} from "./project-service";

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
    <AuthLayout>
      <section className="connected-workspace">
        <Button asChild variant="ghost">
          <Link to="/workspace">{c.back}</Link>
        </Button>
        <p className="eyebrow">{c.title}</p>
        <h1>{project?.name ?? c.title}</h1>
        <p className="page-description">{c.hint}</p>
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
            className="company-form"
            key={`${project.revision}:${reload}`}
            onSubmit={submit}
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
        )}
      </section>
    </AuthLayout>
  );
}
