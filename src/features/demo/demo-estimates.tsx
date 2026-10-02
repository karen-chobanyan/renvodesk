import { Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { draftCopy } from "@/features/estimates/draft-copy";
import { workflowCopy } from "@/features/estimates/workflow-copy";
import { useDemo } from "@/lib/demo-store";
import { formatMoney, useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { demoEstimateTotal } from "./demo-estimate-model";
import { say } from "./demo-types";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase();

export function DemoEstimatesPage() {
  const { locale, t } = useLocale(),
    c = draftCopy[locale],
    d = useDemoCopy();
  const { estimates, projects, company } = useDemo();
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const rows = estimates
    .map((row) => ({
      row,
      project: projects.find((p) => p.id === row.projectId),
    }))
    .filter(({ row, project }) =>
      normalize(
        `${say(row.title, locale)} ${project?.name ?? ""} ${project?.client ?? ""}`,
      ).includes(normalize(search.trim())),
    );
  function submit(e: FormEvent) {
    e.preventDefault();
    setSearch(query);
  }
  return (
    <>
      <Link className="back-link" to="/projects">
        {t("back")}
      </Link>
      <PageHeader
        eyebrow={company.name}
        title={t("estimates")}
        description={c.notice}
        action={
          <Button asChild>
            <Link to="/projects">{d.chooseProject}</Link>
          </Button>
        }
      />
      <form className="estimate-search" onSubmit={submit}>
        <div className="search-field">
          <Search size={17} />
          <Input
            aria-label={d.estimateSearch}
            placeholder={d.estimateSearch}
            maxLength={160}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          {d.searchAction}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setQuery("");
            setSearch("");
          }}
        >
          {d.reset}
        </Button>
      </form>
      <section aria-label={t("estimates")}>
        <p className="helper-text">{d.estimatesHint}</p>
        <div className="table-scroll">
          <table className="project-table">
            <thead>
              <tr>
                <th>{c.title}</th>
                <th>{t("project")}</th>
                <th>{t("client")}</th>
                <th>{t("status")}</th>
                <th className="numeric">{t("excludingTax")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, project }) => (
                <tr key={row.id}>
                  <td>
                    <Link
                      className="saved-project-link"
                      to={`/estimates/${row.id}`}
                    >
                      {say(row.title, locale)}
                    </Link>
                    <small className="estimate-revision">
                      {d.revision} {row.revision}
                    </small>
                  </td>
                  <td>
                    <Link to={`/projects/${row.projectId}`}>
                      {project?.name ?? "—"}
                    </Link>
                  </td>
                  <td>{project?.client ?? "—"}</td>
                  <td>
                    <span className="status status-planning">
                      {workflowCopy[locale][row.status]}
                    </span>
                  </td>
                  <td className="numeric">
                    {formatMoney(demoEstimateTotal(row), locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="workspace-loading">{d.noEstimates}</p>}
      </section>
    </>
  );
}

export function DemoProjectEstimates({ projectId }: { projectId: string }) {
  const { locale } = useLocale(),
    c = draftCopy[locale];
  const { estimates, createEstimate } = useDemo();
  const navigate = useNavigate();
  const rows = estimates.filter((row) => row.projectId === projectId);
  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = String(
      new FormData(e.currentTarget).get("title") ?? "",
    ).trim();
    if (!title) return;
    navigate(`/estimates/${createEstimate(projectId, title)}`);
  }
  return (
    <section id="project-estimates" className="saved-projects">
      <h2>{c.heading}</h2>
      <details className="project-create">
        <summary className="button button-primary">{c.new}</summary>
        <form className="company-form" onSubmit={create}>
          <label className="field" htmlFor="new-estimate-title">
            {c.title}
            <Input
              id="new-estimate-title"
              name="title"
              maxLength={120}
              required
            />
          </label>
          <Button>{c.create}</Button>
        </form>
      </details>
      {!rows.length && <p>{c.empty}</p>}
      <ul className="saved-project-list">
        {rows.map((row) => (
          <li key={row.id}>
            <Link className="saved-project-link" to={`/estimates/${row.id}`}>
              {say(row.title, locale)}
            </Link>
            <span>
              {workflowCopy[locale][row.status]} ·{" "}
              {formatMoney(demoEstimateTotal(row), locale)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
