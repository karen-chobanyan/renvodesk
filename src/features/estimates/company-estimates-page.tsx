import { Search } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOrganization } from "@/features/organizations/organization-service";
import { formatMoney, useLocale } from "@/lib/i18n";
import { draftCopy } from "./draft-copy";
import { listCompanyEstimates } from "./estimate-service";
import { estimateStatus, workflowCopy } from "./workflow-copy";
export function CompanyEstimatesPage() {
  const { organizationId = "" } = useParams();
  return <CompanyEstimates key={organizationId} org={organizationId} />;
}
function CompanyEstimates({ org }: { org: string }) {
  const { locale, t } = useLocale(),
    c = draftCopy[locale];
  const [company, setCompany] = useState(""),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [reload, setReload] = useState(0);
  const label =
    locale === "fr"
      ? "Rechercher un devis, projet ou client"
      : "Search estimates, projects or clients";
  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh company identity on explicit retry
  useEffect(() => {
    let active = true;
    void getOrganization(org)
      .then((row) => {
        if (active) setCompany(row?.name ?? "");
      })
      .catch(() => {
        if (active) setCompany("");
      });
    return () => {
      active = false;
    };
  }, [org, reload]);
  function submit(e: FormEvent) {
    e.preventDefault();
    setSearch(query.trim());
    setReload((n) => n + 1);
  }
  return (
    <AppShell live company={company}>
      <Link className="back-link" to={`/workspace?company=${org}`}>
        {locale === "fr" ? "Retour aux projets" : "Back to projects"}
      </Link>
      <PageHeader
        eyebrow={company || "RenvoDesk"}
        title={t("estimates")}
        description={c.notice}
        action={
          <Button asChild>
            <Link to={`/workspace?company=${org}`}>
              {locale === "fr"
                ? "Choisir un projet pour créer un devis"
                : "Choose a project to create an estimate"}
            </Link>
          </Button>
        }
      />
      <form className="estimate-search" onSubmit={submit}>
        <div className="search-field">
          <Search size={17} />
          <Input
            aria-label={label}
            placeholder={label}
            maxLength={160}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          {locale === "fr" ? "Rechercher" : "Search"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setQuery("");
            setSearch("");
            setReload((n) => n + 1);
          }}
        >
          {locale === "fr" ? "Réinitialiser" : "Reset"}
        </Button>
      </form>
      <EstimateResults
        key={`${org}:${search}:${reload}`}
        org={org}
        search={search}
      />
    </AppShell>
  );
}
function EstimateResults({ org, search }: { org: string; search: string }) {
  const { locale, t } = useLocale(),
    c = draftCopy[locale];
  const [rows, setRows] = useState<
      Awaited<ReturnType<typeof listCompanyEstimates>>
    >([]),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [more, setMore] = useState(false),
    [reload, setReload] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit retry resets pagination
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void listCompanyEstimates(org, search)
      .then((data) => {
        if (active) {
          setRows(data);
          setMore(data.length === 20);
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
  }, [org, search, reload]);
  async function loadMore() {
    setLoading(true);
    try {
      const data = await listCompanyEstimates(org, search, rows.length);
      setRows((old) => [
        ...old,
        ...data.filter((r) => !old.some((o) => o.id === r.id)),
      ]);
      setMore(data.length === 20);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <section aria-label={t("estimates")}>
      <p className="helper-text">
        {locale === "fr"
          ? "Brouillons enregistrés, du plus récent au plus ancien. La recherche porte sur toute l’entreprise."
          : "Saved drafts, newest first. Search covers the entire company."}
      </p>
      {loading && <p role="status">{c.loading}</p>}
      {failed ? (
        <div role="alert">
          <p>{c.error}</p>
          <Button onClick={() => setReload((n) => n + 1)}>{c.retry}</Button>
        </div>
      ) : (
        <>
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
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        className="saved-project-link"
                        to={`/workspace/${org}/projects/${row.project_id}/estimates/${row.id}`}
                      >
                        {row.title}
                      </Link>
                      <small className="estimate-revision">
                        {locale === "fr" ? "Révision" : "Revision"}{" "}
                        {row.revision}
                      </small>
                    </td>
                    <td>
                      <Link to={`/workspace/${org}/projects/${row.project_id}`}>
                        {row.projects?.name ?? "—"}
                      </Link>
                    </td>
                    <td>{row.projects?.client_name ?? "—"}</td>
                    <td>
                      <span className="status status-planning">
                        {workflowCopy[locale][estimateStatus(row.status)]}
                      </span>
                    </td>
                    <td className="numeric">
                      {formatMoney(row.total_cents, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !rows.length && (
            <p className="workspace-loading">
              {locale === "fr"
                ? "Aucun devis trouvé. Créez un brouillon depuis un projet ou modifiez la recherche."
                : "No estimates found. Create a draft from a project or change your search."}
            </p>
          )}
          {more && (
            <Button disabled={loading} variant="outline" onClick={loadMore}>
              {c.more}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
