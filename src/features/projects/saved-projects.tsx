import { Plus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { projectCopy } from "./project-copy";
import { ProjectFields } from "./project-fields";
import {
  createProject,
  listProjects,
  PROJECT_PAGE_SIZE,
  type SavedProject,
} from "./project-service";

export function SavedProjects({ organizationId }: { organizationId: string }) {
  const { locale, t } = useLocale(),
    c = projectCopy[locale];
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0),
    [hasMore, setHasMore] = useState(false);
  const [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<"invalid" | "saveError" | null>(null),
    [saved, setSaved] = useState(false);
  const [id, setId] = useState(() => crypto.randomUUID());
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload refreshes after a save or failed query
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void listProjects(organizationId)
      .then((data) => {
        if (active) {
          setProjects(data);
          setHasMore(data.length === PROJECT_PAGE_SIZE);
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
  }, [organizationId, reload]);
  async function more() {
    setLoading(true);
    setFailed(false);
    try {
      const data = await listProjects(organizationId, projects.length);
      setProjects((current) => [
        ...current,
        ...data.filter((row) => !current.some((p) => p.id === row.id)),
      ]);
      setHasMore(data.length === PROJECT_PAGE_SIZE);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const input = {
      name: String(values.get("name") ?? "").trim(),
      client_name: String(values.get("client_name") ?? "").trim(),
      city: String(values.get("city") ?? "").trim(),
      address: String(values.get("address") ?? "").trim(),
    };
    if (!input.name || !input.client_name || !input.city) {
      setError("invalid");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await createProject(organizationId, id, input);
      setId(crypto.randomUUID());
      setCreating(false);
      setSaved(true);
      setReload((n) => n + 1);
    } catch {
      setError("saveError");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="saved-projects" aria-labelledby="saved-projects-title">
      <div className="section-heading workspace-heading">
        <h2 id="saved-projects-title">{c.title}</h2>
        {!creating && (
          <Button
            onClick={() => {
              setCreating(true);
              setSaved(false);
              setError(null);
            }}
          >
            <Plus size={15} />
            {t("newProject")}
          </Button>
        )}
      </div>
      <p className="helper-text">{c.hint}</p>
      {creating && (
        <form className="company-form" onSubmit={submit}>
          <fieldset disabled={busy} className="project-fields">
            <ProjectFields />
            <div className="dialog-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreating(false);
                  setError(null);
                }}
              >
                {c.cancel}
              </Button>
              <Button type="submit">{busy ? c.loading : c.create}</Button>
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="error-message">
              {c[error]}
            </p>
          )}
        </form>
      )}
      {saved && <p role="status">{c.saved}</p>}
      {loading && <p role="status">{c.loading}</p>}
      {failed ? (
        <div>
          <p role="alert">{c.error}</p>
          <Button variant="outline" onClick={() => setReload((n) => n + 1)}>
            {c.retry}
          </Button>
        </div>
      ) : !loading && projects.length === 0 ? (
        <p className="workspace-loading">{c.empty}</p>
      ) : null}
      <ul className="saved-project-list">
        {projects.map((project) => (
          <li key={project.id}>
            <div>
              <Link
                className="saved-project-link"
                to={`/workspace/${organizationId}/projects/${project.id}`}
              >
                {project.name}
              </Link>
              <p>
                {project.client_name} · {project.city}
              </p>
              {project.address && <small>{project.address}</small>}
            </div>
            <StatusBadge
              status={project.status as "planning" | "active" | "completed"}
            />
          </li>
        ))}
      </ul>
      {hasMore && !failed && (
        <Button disabled={loading} variant="outline" onClick={more}>
          {c.more}
        </Button>
      )}
    </section>
  );
}
