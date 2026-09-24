import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useWorkspace,
  useWorkspaceRouteState,
  workspaceKeys,
} from "@/features/organizations/workspace-context";
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
  const { organization } = useWorkspace();
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const client = useQueryClient();
  const [query, setQuery] = useWorkspaceRouteState(
    `estimates:${org}:query`,
    "",
  );
  const [search, setSearch] = useWorkspaceRouteState(
    `estimates:${org}:search`,
    "",
  );
  const label =
    locale === "fr"
      ? "Rechercher un devis, projet ou client"
      : "Search estimates, projects or clients";
  function submit(e: FormEvent) {
    e.preventDefault();
    const next = query.trim();
    setSearch(next);
    void client.invalidateQueries({
      queryKey: workspaceKeys.estimates(userId, org, next),
    });
  }
  return (
    <>
      <Link className="back-link" to={`/workspace?company=${org}`}>
        {locale === "fr" ? "Retour aux projets" : "Back to projects"}
      </Link>
      <PageHeader
        eyebrow={organization?.name || "RenvoDesk"}
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
          }}
        >
          {locale === "fr" ? "Réinitialiser" : "Reset"}
        </Button>
      </form>
      <EstimateResults org={org} search={search} />
    </>
  );
}
function EstimateResults({ org, search }: { org: string; search: string }) {
  const { locale, t } = useLocale(),
    c = draftCopy[locale];
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const results = useInfiniteQuery({
    queryKey: workspaceKeys.estimates(userId, org, search),
    queryFn: ({ pageParam }) => listCompanyEstimates(org, search, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length * 20 : undefined,
    enabled: !!userId && !!org,
  });
  const rows = results.data?.pages.flat() ?? [];
  const loading = results.isPending && results.isFetching;
  const failed = results.isError && !results.data;
  const more = results.hasNextPage;
  return (
    <section aria-label={t("estimates")}>
      <p className="helper-text">
        {locale === "fr"
          ? "Brouillons enregistrés, du plus récent au plus ancien. La recherche porte sur toute l’entreprise."
          : "Saved drafts, newest first. Search covers the entire company."}
      </p>
      {loading && <p role="status">{c.loading}</p>}
      {results.isError && results.data && (
        <p role="alert" className="error-message">
          {c.error}
        </p>
      )}
      {failed ? (
        <div role="alert">
          <p>{c.error}</p>
          <Button onClick={() => void results.refetch()}>{c.retry}</Button>
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
            <Button
              disabled={results.isFetchingNextPage}
              variant="outline"
              onClick={() => void results.fetchNextPage()}
            >
              {c.more}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
