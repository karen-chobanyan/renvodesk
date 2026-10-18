import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useWorkspaceRouteState,
  workspaceKeys,
} from "@/features/organizations/workspace-context";
import {
  listProjects,
  PROJECT_PAGE_SIZE,
} from "@/features/projects/project-service";
import { useLocale } from "@/lib/i18n";
import { draftCopy } from "./draft-copy";
import { EstimateCreateDialog } from "./estimate-create-dialog";
import {
  type EstimateFilter,
  EstimateRegisterEmpty,
  EstimateRegisterHeader,
  EstimateRegisterTable,
  EstimateRegisterTools,
} from "./estimate-register";
import { createEstimate, listCompanyEstimates } from "./estimate-service";
import { registerCopy } from "./register-copy";
import { estimateStatus } from "./workflow-copy";

export function CompanyEstimatesPage() {
  const { organizationId = "" } = useParams();
  return <CompanyEstimates key={organizationId} org={organizationId} />;
}
function CompanyEstimates({ org }: { org: string }) {
  const { locale, t } = useLocale(),
    c = registerCopy[locale],
    d = draftCopy[locale];
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
  const [status, setStatus] = useWorkspaceRouteState<EstimateFilter>(
    `estimates:${org}:status`,
    "",
  );
  const [creating, setCreating] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null),
    input = useRef<HTMLInputElement>(null);
  const results = useInfiniteQuery({
    queryKey: workspaceKeys.estimates(userId, org, search, status),
    queryFn: ({ pageParam }) =>
      listCompanyEstimates(org, search, pageParam, status),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length * 20 : undefined,
    enabled: !!userId && !!org,
  });
  const rows = results.data?.pages.flat() ?? [];
  const loading = results.isPending;
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
  function submit() {
    const next = query.trim();
    setSearch(next);
    void client.invalidateQueries({
      queryKey: workspaceKeys.estimates(userId, org, next, status),
    });
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
        onSearch={submit}
        onReset={reset}
        inputRef={input}
      />
      <section aria-label={t("estimates")} aria-busy={results.isFetching}>
        <p className="register-scope">{c.recorded}</p>
        {loading && <p role="status">{d.loading}</p>}
        {results.isError && (
          <div role="alert" className="register-error">
            <p>{d.error}</p>
            <Button
              variant="outline"
              disabled={results.isFetching}
              onClick={() =>
                void (results.isFetchNextPageError
                  ? results.fetchNextPage()
                  : results.refetch())
              }
            >
              {d.retry}
            </Button>
          </div>
        )}
        {rows.length > 0 && (
          <EstimateRegisterTable
            rows={rows.map((row) => ({
              id: row.id,
              title: row.title,
              revision: row.revision,
              status: estimateStatus(row.status),
              totalCents: row.total_cents,
              project: row.projects?.name ?? "—",
              client: row.projects?.client_name ?? "—",
              href: `/workspace/${org}/projects/${row.project_id}/estimates/${row.id}`,
              projectHref: `/workspace/${org}/projects/${row.project_id}`,
            }))}
          />
        )}
        {!loading && !results.isError && rows.length === 0 && (
          <EstimateRegisterEmpty
            filtered={!!search || !!status}
            onReset={reset}
            onNew={open}
          />
        )}
        {!loading && results.data && (
          <div className="estimate-register-footer">
            <p className="register-scope" role="status">
              {c.loaded}: {rows.length}
            </p>
            {results.hasNextPage && (
              <Button
                disabled={results.isFetching}
                variant="outline"
                onClick={() => void results.fetchNextPage()}
              >
                {results.isFetchingNextPage ? d.loading : d.more}
              </Button>
            )}
          </div>
        )}
      </section>
      {creating && (
        <LiveEstimateCreate
          org={org}
          userId={userId}
          trigger={trigger.current}
          close={() => setCreating(false)}
        />
      )}
    </div>
  );
}

function LiveEstimateCreate({
  org,
  userId,
  trigger,
  close,
}: {
  org: string;
  userId: string;
  trigger: HTMLButtonElement | null;
  close: () => void;
}) {
  const navigate = useNavigate(),
    client = useQueryClient();
  const projects = useInfiniteQuery({
    queryKey: workspaceKeys.projects(userId, org),
    queryFn: ({ pageParam }) => listProjects(org, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === PROJECT_PAGE_SIZE
        ? pages.length * PROJECT_PAGE_SIZE
        : undefined,
    enabled: !!userId && !!org,
  });
  return (
    <EstimateCreateDialog
      projects={(projects.data?.pages.flat() ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        client: p.client_name,
      }))}
      loading={projects.isFetching}
      failed={projects.isError}
      more={projects.hasNextPage}
      onMore={() => void projects.fetchNextPage()}
      onRetry={() =>
        void (projects.isFetchNextPageError
          ? projects.fetchNextPage()
          : projects.refetch())
      }
      projectsHref={`/workspace?company=${org}`}
      trigger={trigger}
      close={close}
      create={async (project, title, id) => {
        const draft = await createEstimate(org, project, id, title);
        void client.invalidateQueries({
          queryKey: ["workspace", userId, org, "estimates"],
        });
        navigate(`/workspace/${org}/projects/${project}/estimates/${draft.id}`);
      }}
    />
  );
}
