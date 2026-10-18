import {
  ArrowUpRight,
  CalendarDays,
  FolderOpen,
  Search,
  X,
} from "lucide-react";
import { type ReactNode, useRef } from "react";
import { Link } from "react-router";
import { EmptyState, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import type { ProjectStatus } from "./data";
import { projectCopy } from "./project-copy";

export function ProjectRegisterHeader({
  action,
  scheduleHref,
}: {
  action?: ReactNode;
  scheduleHref: string;
}) {
  const { locale } = useLocale();
  const c = projectCopy[locale];
  return (
    <header className="project-register-header">
      <div>
        <h1 id="saved-projects-title" className="register-title">
          {c.title}
        </h1>
        <p className="page-description">{c.registerHint}</p>
      </div>
      <div className="project-register-actions">
        <Button asChild variant="outline">
          <Link to={scheduleHref}>
            <CalendarDays size={16} />
            {c.schedule}
          </Link>
        </Button>
        {action}
      </div>
    </header>
  );
}

export type RegisterProject = {
  id: string;
  name: string;
  client: string;
  city: string;
  status: ProjectStatus;
  href: string;
};

/** Presentation only: callers retain their own live or fictional data sources. */
export function ProjectRegisterList({
  projects,
  query,
  status,
  onQuery,
  onStatus,
  loading = false,
  failed = false,
  onRetry,
  loadedOnly = false,
  more,
  canCreate = true,
}: {
  projects: RegisterProject[];
  query: string;
  status: string;
  onQuery: (value: string) => void;
  onStatus: (value: ProjectStatus | "all") => void;
  loading?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  loadedOnly?: boolean;
  more?: ReactNode;
  canCreate?: boolean;
}) {
  const { t, locale } = useLocale();
  const c = projectCopy[locale];
  const search = useRef<HTMLInputElement>(null);
  const visible = projects.filter(
    (project) =>
      (status === "all" || status === project.status) &&
      `${project.name} ${project.client} ${project.city}`
        .toLocaleLowerCase(locale)
        .includes(query.trim().toLocaleLowerCase(locale)),
  );
  const filtered = query !== "" || status !== "all";
  function reset() {
    onQuery("");
    onStatus("all");
    search.current?.focus();
  }
  return (
    <div className="project-register-list">
      <fieldset
        className="section-tabs register-status"
        aria-label={t("status")}
      >
        {(["all", "active", "planning", "completed"] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-label={t(value)}
            aria-pressed={status === value}
            className={status === value ? "selected" : ""}
            onClick={() => onStatus(value)}
          >
            {t(value)}
            <span aria-hidden="true">
              {loading || failed
                ? "—"
                : value === "all"
                  ? projects.length
                  : projects.filter((p) => p.status === value).length}
            </span>
          </button>
        ))}
      </fieldset>
      <div className="register-toolbar">
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <Input
            ref={search}
            aria-label={t("search")}
            placeholder={t("search")}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label={c.clearSearch}
              onClick={() => {
                onQuery("");
                search.current?.focus();
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        {filtered && (
          <Button variant="ghost" onClick={reset}>
            {t("clear")}
          </Button>
        )}
      </div>
      {loadedOnly && <p className="register-scope">{c.loadedScope}</p>}
      {loading ? (
        <div className="register-loading" role="status">
          <span className="sr-only">{c.loading}</span>
          {[0, 1, 2].map((row) => (
            <div key={row} aria-hidden="true">
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : failed ? (
        <div className="register-message">
          <p role="alert">{c.error}</p>
          <Button variant="outline" onClick={onRetry}>
            {c.retry}
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title={c.emptyTitle}
          description={canCreate ? c.emptyHint : c.memberEmptyHint}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={t("noResults")}
          description={loadedOnly && more ? c.noLoadedResults : t("trySearch")}
        />
      ) : (
        <div className="table-scroll">
          <table className="project-table register-table">
            <thead>
              <tr>
                <th scope="col">{t("project")}</th>
                <th scope="col">{t("city")}</th>
                <th scope="col">{t("status")}</th>
                <th scope="col">
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
                      to={project.href}
                    >
                      <span
                        className="register-project-icon"
                        aria-hidden="true"
                      >
                        <FolderOpen size={19} strokeWidth={1.5} />
                      </span>
                      <span className="register-project-name">
                        <strong>{project.name}</strong>
                        <small>{project.client}</small>
                      </span>
                    </Link>
                  </td>
                  <td className="register-city">{project.city}</td>
                  <td className="register-project-status">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="register-open">
                    <Link
                      className="row-arrow"
                      aria-label={`${t("open")} — ${project.name}`}
                      to={project.href}
                    >
                      <ArrowUpRight size={17} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !failed && (
        <div className="register-footer">
          <p role="status">
            {visible.length} / {projects.length}{" "}
            {loadedOnly ? c.loadedProjects : t("projectCount")}
          </p>
          {more}
        </div>
      )}
    </div>
  );
}
