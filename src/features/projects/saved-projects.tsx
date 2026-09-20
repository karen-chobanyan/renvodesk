import { ArrowUpRight, Plus, Search } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { PlanMark, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewProjectFields } from "@/features/clients/project-client-picker";
import { useCompanyAccess } from "@/features/team/company-access";
import { useLocale } from "@/lib/i18n";
import { projectCopy } from "./project-copy";
import {
  createProject,
  listProjects,
  PROJECT_PAGE_SIZE,
  type SavedProject,
} from "./project-service";

export function SavedProjects({ organizationId }: { organizationId: string }) {
  const { locale, t } = useLocale(),
    c = projectCopy[locale];
  const { owner } = useCompanyAccess(organizationId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
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
      client_id: String(values.get("client_id") ?? "") || null,
      property_id: String(values.get("property_id") ?? "") || null,
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
  const visible = projects.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      `${p.name} ${p.client_name} ${p.city}`
        .toLocaleLowerCase(locale)
        .includes(query.toLocaleLowerCase(locale)),
  );
  return (
    <section className="saved-projects" aria-labelledby="saved-projects-title">
      <div className="section-heading workspace-heading">
        <h2 id="saved-projects-title">{c.title}</h2>
        {owner && !creating && (
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

      <section className="metrics" aria-label={t("figures")}>
        {(["active", "planning", "completed"] as const).map((value) => (
          <div key={value}>
            <span>{t(value)}</span>
            <strong>
              {loading || failed
                ? "—"
                : projects.filter((p) => p.status === value).length}
            </strong>
            <small>
              {locale === "fr"
                ? "Parmi les projets chargés"
                : "Among loaded projects"}
            </small>
          </div>
        ))}
      </section>
      {owner && creating && (
        <form className="company-form" onSubmit={submit}>
          <fieldset disabled={busy} className="project-fields">
            <NewProjectFields org={organizationId} />
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
      <div className="project-workspace">
        <div className="project-main">
          <fieldset className="section-tabs" aria-label={t("status")}>
            {(["all", "active", "planning", "completed"] as const).map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  className={status === value ? "selected" : ""}
                  aria-pressed={status === value}
                  onClick={() => setStatus(value)}
                >
                  {t(value)}
                </button>
              ),
            )}
          </fieldset>
          <div className="table-toolbar">
            <div className="search-field">
              <Search size={17} />
              <Input
                aria-label={t("search")}
                placeholder={t("search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <p className="helper-text">
            {locale === "fr"
              ? "Recherche et filtres sur les projets chargés."
              : "Search and filters apply to loaded projects."}
          </p>
          <div className="table-scroll">
            <table className="project-table">
              <thead>
                <tr>
                  <th>{t("project")}</th>
                  <th>{t("status")}</th>
                  <th>{t("city")}</th>
                  <th>
                    <span className="sr-only">{t("open")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link
                        className="project-link"
                        aria-label={project.name}
                        to={`/workspace/${organizationId}/projects/${project.id}`}
                      >
                        <span className="project-thumbnail sage">
                          <PlanMark />
                        </span>
                        <span>
                          <strong>{project.name}</strong>
                          <small>{project.client_name}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <StatusBadge
                        status={
                          project.status as "planning" | "active" | "completed"
                        }
                      />
                    </td>
                    <td>{project.city}</td>
                    <td>
                      <Link
                        className="row-arrow"
                        aria-label={`${t("open")} — ${project.name}`}
                        to={`/workspace/${organizationId}/projects/${project.id}`}
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading &&
            !failed &&
            projects.length > 0 &&
            visible.length === 0 && (
              <p className="workspace-loading">{t("noResults")}</p>
            )}
        </div>
        <aside className="context-panel" aria-label={t("attention")}>
          <div className="context-title">
            <h2>{t("attention")}</h2>
          </div>
          <p className="muted context-description">
            {locale === "fr"
              ? "Retrouvez les tâches de vos chantiers dans le planning de l’entreprise."
              : "Find your project tasks in the company schedule."}
          </p>
          <div className="next-steps">
            <Link to={`/workspace/${organizationId}/schedule`}>
              <span>
                <strong>
                  {locale === "fr" ? "Ouvrir le planning" : "Open schedule"}
                </strong>
                <small>
                  {locale === "fr"
                    ? "Semaine, retards et tâches sans date"
                    : "Week, overdue and undated tasks"}
                </small>
              </span>
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="project-note">
            <div className="note-top">
              {t("preview")} · {t("demo")}
            </div>
            <div className="blueprint">
              <PlanMark large />
            </div>
            <h3>{locale === "fr" ? "Croquis du chantier" : "Site sketches"}</h3>
            <p>
              {locale === "fr"
                ? "Illustration fictive. L’éditeur de plans sera intégré plus tard."
                : "Fictional illustration. The drawing editor will be integrated later."}
            </p>
            <Link to="/projects/maison-ixelles">
              {t("viewProject")}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
      {hasMore && !failed && (
        <Button disabled={loading} variant="outline" onClick={more}>
          {c.more}
        </Button>
      )}
    </section>
  );
}
