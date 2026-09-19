import {
  ArrowRight,
  ArrowUpRight,
  Layers,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import {
  EmptyState,
  PageHeader,
  PlanMark,
  StatusBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/lib/demo-store";
import { formatMoney, useLocale } from "@/lib/i18n";
import { filterProjects, type ProjectStatus } from "./data";
export function ProjectsPage() {
  const { t, locale } = useLocale();
  const { projects, addProject } = useDemo();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const visible = filterProjects(projects, query, status);
  const total = visible.reduce((n, p) => n + p.budget, 0);
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={t("projects")}
        title={t("title")}
        description={t("subtitle")}
        action={
          <Dialog
            open={open}
            onOpenChange={(value) => {
              setOpen(value);
              setError("");
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus size={17} />
                {t("newProject")}
              </Button>
            </DialogTrigger>
            <DialogContent
              title={t("newProject")}
              description={t("createHint")}
              closeLabel={t("close")}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  const name = String(data.get("name") ?? "").trim(),
                    client = String(data.get("client") ?? "").trim(),
                    city = String(data.get("city") ?? "").trim();
                  if (!name || !client || !city) {
                    setError(t("required"));
                    return;
                  }
                  addProject({
                    id: crypto.randomUUID(),
                    name,
                    client,
                    city,
                    address: city,
                    status: "planning",
                    progress: 0,
                    budget: 0,
                    actual: 0,
                    committed: 0,
                    remaining: 0,
                    phase: "prepared",
                    next: "reviewEstimate",
                    color: "sage",
                  });
                  setQuery("");
                  setStatus("all");
                  setOpen(false);
                  setNotice(t("created"));
                }}
              >
                <label className="field" htmlFor="project-name">
                  {t("projectName")}
                  <Input
                    id="project-name"
                    name="name"
                    required
                    maxLength={120}
                  />
                </label>
                <label className="field" htmlFor="project-client">
                  {t("client")}
                  <Input
                    id="project-client"
                    name="client"
                    required
                    maxLength={120}
                  />
                </label>
                <label className="field" htmlFor="project-city">
                  {t("city")}
                  <Input
                    id="project-city"
                    name="city"
                    required
                    maxLength={120}
                  />
                </label>
                {error && (
                  <p role="alert" className="error-message">
                    {error}
                  </p>
                )}
                <div className="dialog-actions">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      {t("cancel")}
                    </Button>
                  </DialogClose>
                  <Button type="submit">{t("create")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button
            type="button"
            aria-label={t("close")}
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <section className="metrics" aria-label={t("figures")}>
        <div>
          <span>{t("activeProjects")}</span>
          <strong>
            {String(
              visible.filter((p) => p.status === "active").length,
            ).padStart(2, "0")}
            <span className="metric-caption">
              / {String(visible.length).padStart(2, "0")}
            </span>
          </strong>
          <small>{t("totalProjects")}</small>
        </div>
        <div>
          <span>{t("contractValue")}</span>
          <strong>{formatMoney(total, locale)}</strong>
          <small>{t("excludingTax")}</small>
        </div>
        <div>
          <span>{t("remaining")}</span>
          <strong>
            {formatMoney(
              visible.reduce((n, p) => n + p.remaining, 0),
              locale,
            )}
          </strong>
          <small>{t("toComplete")}</small>
        </div>
      </section>
      <div className="project-workspace">
        <section className="project-main">
          <fieldset className="section-tabs" aria-label={t("status")}>
            {(["all", "active", "planning", "completed"] as const).map((s) => (
              <button
                type="button"
                key={s}
                aria-pressed={status === s}
                className={status === s ? "selected" : ""}
                onClick={() => setStatus(s)}
              >
                {t(s)}
                {s === "all" && <span>{projects.length}</span>}
              </button>
            ))}
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
              {query && (
                <button
                  type="button"
                  aria-label={t("clear")}
                  onClick={() => setQuery("")}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <SlidersHorizontal
              className="toolbar-decoration"
              size={18}
              aria-hidden="true"
            />
          </div>
          {visible.length ? (
            <div className="table-scroll">
              <table className="project-table">
                <thead>
                  <tr>
                    <th>{t("project")}</th>
                    <th>{t("status")}</th>
                    <th className="numeric">{t("budget")}</th>
                    <th>{t("progress")}</th>
                    <th>
                      <span className="sr-only">{t("open")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link className="project-link" to={`/projects/${p.id}`}>
                          <span className={`project-thumbnail ${p.color}`}>
                            <PlanMark />
                          </span>
                          <span>
                            <strong>{p.name}</strong>
                            <small>
                              {p.client} <span>·</span> {p.city}
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="numeric">
                        {formatMoney(p.budget, locale)}
                      </td>
                      <td>
                        <div className="progress-cell">
                          <div
                            className="progress-track"
                            role="progressbar"
                            aria-label={`${t("progress")} — ${p.name}`}
                            aria-valuenow={p.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <span style={{ width: `${p.progress}%` }} />
                          </div>
                          <span>{p.progress}%</span>
                        </div>
                      </td>
                      <td>
                        <Link
                          className="row-arrow"
                          to={`/projects/${p.id}`}
                          aria-label={`${t("open")} — ${p.name}`}
                        >
                          <ArrowUpRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={t("noResults")}
              description={t("trySearch")}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setStatus("all");
                  }}
                >
                  {t("clear")}
                </Button>
              }
            />
          )}
          <div className="table-footer">
            <span>
              {visible.length} {t("projectCount")}
            </span>
            <span>{t("excludingTax")}</span>
          </div>
        </section>
        <aside className="context-panel">
          <div className="context-title">
            <h2>{t("attention")}</h2>
            <span className="tiny-label">
              {String(
                visible.filter((p) => p.status !== "completed").slice(0, 3)
                  .length,
              ).padStart(2, "0")}
            </span>
          </div>
          <p className="muted context-description">{t("attentionText")}</p>
          <div className="next-steps">
            {visible
              .filter((p) => p.status !== "completed")
              .slice(0, 3)
              .map((p, i) => (
                <Link
                  key={p.id}
                  to={
                    p.next === "reviewEstimate"
                      ? `/estimates/${p.id}`
                      : `/projects/${p.id}`
                  }
                >
                  <span className="step-index">0{i + 1}</span>
                  <span>
                    <strong>{t(p.next)}</strong>
                    <small>{p.name}</small>
                  </span>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
          </div>
          <div className="project-note">
            <div className="note-top">
              <Layers size={16} />
              <span>{t("preview")}</span>
            </div>
            <div className="blueprint">
              <PlanMark large />
            </div>
            <h3>Maison des Tilleuls</h3>
            <p>
              <MapPin size={12} /> Ixelles, Belgique
            </p>
            <Link to="/projects/maison-ixelles">
              {t("viewProject")}
              <ArrowRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
