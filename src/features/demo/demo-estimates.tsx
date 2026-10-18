import { type FormEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { draftCopy } from "@/features/estimates/draft-copy";
import { EstimateCreateDialog } from "@/features/estimates/estimate-create-dialog";
import {
  type EstimateFilter,
  EstimateRegisterEmpty,
  EstimateRegisterHeader,
  EstimateRegisterTable,
  EstimateRegisterTools,
} from "@/features/estimates/estimate-register";
import { registerCopy } from "@/features/estimates/register-copy";
import { workflowCopy } from "@/features/estimates/workflow-copy";
import { useDemo } from "@/lib/demo-store";
import { formatMoney, useLocale } from "@/lib/i18n";
import { demoEstimateTotal } from "./demo-estimate-model";
import { say } from "./demo-types";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase();
export function DemoEstimatesPage() {
  const { locale, t } = useLocale(),
    c = registerCopy[locale];
  const { estimates, projects, createEstimate } = useDemo();
  const navigate = useNavigate();
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const [status, setStatus] = useState<EstimateFilter>("");
  const [creating, setCreating] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null),
    input = useRef<HTMLInputElement>(null);
  const rows = estimates
    .map((row) => ({
      row,
      project: projects.find((p) => p.id === row.projectId),
    }))
    .filter(
      ({ row, project }) =>
        (!status || row.status === status) &&
        normalize(
          `${say(row.title, locale)} ${project?.name ?? ""} ${project?.client ?? ""}`,
        ).includes(normalize(search)),
    );
  function reset() {
    setQuery("");
    setSearch("");
    setStatus("");
    input.current?.focus();
  }
  function open(button: HTMLButtonElement) {
    trigger.current = button;
    setCreating(true);
  }
  return (
    <div className="estimates-register">
      <EstimateRegisterHeader onNew={open} />
      <EstimateRegisterTools
        status={status}
        onStatus={setStatus}
        query={query}
        onQuery={setQuery}
        search={search}
        onSearch={() => setSearch(query.trim())}
        onReset={reset}
        inputRef={input}
      />
      <section aria-label={t("estimates")}>
        <p className="register-scope">{c.recorded}</p>
        {rows.length ? (
          <EstimateRegisterTable
            rows={rows.map(({ row, project }) => ({
              id: row.id,
              title: say(row.title, locale),
              revision: row.revision,
              status: row.status,
              totalCents: demoEstimateTotal(row),
              project: project?.name ?? "—",
              client: project?.client ?? "—",
              href: `/estimates/${row.id}`,
              projectHref: `/projects/${row.projectId}`,
            }))}
          />
        ) : (
          <EstimateRegisterEmpty
            filtered={!!search || !!status}
            onReset={reset}
            onNew={open}
          />
        )}
        <div className="estimate-register-footer">
          <p className="register-scope" role="status">
            {c.shown}: {rows.length}
          </p>
        </div>
      </section>
      {creating && (
        <EstimateCreateDialog
          projects={projects.map((p) => ({
            id: p.id,
            name: p.name,
            client: p.client,
          }))}
          projectsHref="/projects"
          trigger={trigger.current}
          close={() => setCreating(false)}
          create={async (project, title) => {
            navigate(`/estimates/${createEstimate(project, title)}`);
          }}
        />
      )}
    </div>
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
