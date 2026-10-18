import { FileText, Plus, Search } from "lucide-react";
import type { RefObject } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, useLocale } from "@/lib/i18n";
import { draftCopy } from "./draft-copy";
import { registerCopy } from "./register-copy";
import { type EstimateStatus, workflowCopy } from "./workflow-copy";

export type EstimateFilter = EstimateStatus | "";
export type EstimateRegisterRow = {
  id: string;
  title: string;
  revision: number;
  status: EstimateStatus;
  project: string;
  client: string;
  totalCents: number;
  href: string;
  projectHref: string;
};

export function EstimateRegisterHeader({
  onNew,
}: {
  onNew: (trigger: HTMLButtonElement) => void;
}) {
  const { locale, t } = useLocale();
  return (
    <header className="project-register-header">
      <div>
        <h1 className="register-title">{t("estimates")}</h1>
        <p className="page-description">{registerCopy[locale].hint}</p>
      </div>
      <Button id="estimate-new" onClick={(e) => onNew(e.currentTarget)}>
        <Plus size={16} aria-hidden="true" />
        {draftCopy[locale].new}
      </Button>
    </header>
  );
}

export function EstimateRegisterTools({
  status,
  onStatus,
  query,
  onQuery,
  search,
  onSearch,
  onReset,
  inputRef,
}: {
  status: EstimateFilter;
  onStatus: (status: EstimateFilter) => void;
  query: string;
  onQuery: (query: string) => void;
  search: string;
  onSearch: () => void;
  onReset: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const { locale, t } = useLocale();
  const c = registerCopy[locale];
  return (
    <>
      <fieldset
        className="section-tabs register-status estimate-status-filter"
        aria-label={t("status")}
      >
        {(["", "draft", "sent", "accepted", "declined"] as const).map(
          (value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              className={status === value ? "selected" : ""}
              onClick={() => onStatus(value)}
            >
              {c[value || "all"]}
            </button>
          ),
        )}
      </fieldset>
      <form
        className="register-toolbar estimate-search"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <Input
            ref={inputRef}
            aria-label={c.search}
            placeholder={c.search}
            maxLength={160}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          {c.searchAction}
        </Button>
        {(query || search || status) && (
          <Button type="button" variant="ghost" onClick={onReset}>
            {c.reset}
          </Button>
        )}
      </form>
      {query.trim() !== search && (
        <p className="register-scope" role="status">
          {c.pending}
        </p>
      )}
      <p className="register-scope">{c.scope}</p>
    </>
  );
}

export function EstimateRegisterTable({
  rows,
  showProject = true,
}: {
  rows: EstimateRegisterRow[];
  showProject?: boolean;
}) {
  const { locale, t } = useLocale();
  const c = registerCopy[locale];
  return (
    <div className="table-scroll">
      <table className="project-table estimate-register-table">
        <thead>
          <tr>
            <th>{draftCopy[locale].title}</th>
            {showProject && (
              <th>
                {t("project")} / {t("client")}
              </th>
            )}
            <th>{t("status")}</th>
            <th className="numeric">{c.amount}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="estimate-identity">
                <Link className="estimate-title-link" to={row.href}>
                  {row.title}
                </Link>
                <small className="estimate-revision">
                  {c.revision} {row.revision}
                </small>
              </td>
              {showProject && (
                <td className="estimate-project">
                  <Link to={row.projectHref}>{row.project}</Link>
                  <small>{row.client}</small>
                </td>
              )}
              <td className="estimate-status">
                <span className={`status estimate-status-${row.status}`}>
                  {workflowCopy[locale][row.status]}
                </span>
              </td>
              <td className="numeric estimate-amount">
                <span className="estimate-mobile-label">{c.amount}</span>
                <strong>{formatMoney(row.totalCents, locale)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EstimateRegisterEmpty({
  filtered,
  onReset,
  onNew,
}: {
  filtered: boolean;
  onReset: () => void;
  onNew: (trigger: HTMLButtonElement) => void;
}) {
  const { locale } = useLocale();
  const c = registerCopy[locale];
  return (
    <div className="estimate-register-empty">
      <FileText size={24} aria-hidden="true" />
      <h2>{filtered ? c.noResults : c.empty}</h2>
      <p>{filtered ? c.noResultsHint : c.emptyHint}</p>
      {filtered ? (
        <Button variant="outline" onClick={onReset}>
          {c.reset}
        </Button>
      ) : (
        <Button onClick={(e) => onNew(e.currentTarget)}>
          <Plus size={16} aria-hidden="true" />
          {draftCopy[locale].new}
        </Button>
      )}
    </div>
  );
}
