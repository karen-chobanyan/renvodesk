import { useInfiniteQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/auth-provider";
import {
  type ClientInput,
  saveClient,
} from "@/features/clients/client-service";
import { NewProjectFields } from "@/features/clients/project-client-picker";
import {
  useWorkspaceRouteState,
  workspaceKeys,
} from "@/features/organizations/workspace-context";
import { useCompanyAccess } from "@/features/team/company-access";
import { useLocale } from "@/lib/i18n";
import type { ProjectStatus } from "./data";
import { projectCopy } from "./project-copy";
import { ProjectRegisterHeader, ProjectRegisterList } from "./project-register";
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
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const newProjectButton = useRef<HTMLButtonElement>(null);
  const clientRequest = useRef<{ id: string; input: ClientInput } | null>(null);
  const [clientLocked, setClientLocked] = useState(false);
  const [query, setQuery] = useWorkspaceRouteState(
    `projects:${organizationId}:query`,
    "",
  );
  const [status, setStatus] = useWorkspaceRouteState(
    `projects:${organizationId}:status`,
    "all",
  );
  const projectQuery = useInfiniteQuery({
    queryKey: workspaceKeys.projects(userId, organizationId),
    queryFn: ({ pageParam }) => listProjects(organizationId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === PROJECT_PAGE_SIZE
        ? pages.length * PROJECT_PAGE_SIZE
        : undefined,
    enabled: !!userId && !!organizationId,
  });
  const projects: SavedProject[] = projectQuery.data?.pages.flat() ?? [];
  const loading = projectQuery.isPending && projectQuery.isFetching;
  const failed = projectQuery.isError && !projectQuery.data;
  const hasMore = projectQuery.hasNextPage;
  const [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<"invalid" | "saveError" | null>(null),
    [saved, setSaved] = useState(false);
  const [id, setId] = useState(() => crypto.randomUUID());
  function more() {
    void projectQuery.fetchNextPage();
  }
  function closeCreation() {
    if (busy) return;
    setCreating(false);
    clientRequest.current = null;
    setClientLocked(false);
    setError(null);
    requestAnimationFrame(() => newProjectButton.current?.focus());
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const input = {
      client_id: String(values.get("client_id") ?? "") || null,
      property_id: String(values.get("property_id") ?? "") || null,
      name: String(values.get("project_name") ?? "").trim(),
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
      if (!input.client_id) {
        clientRequest.current ??= {
          id: crypto.randomUUID(),
          input: {
            name: input.client_name,
            kind: String(values.get("new_client_kind") ?? "individual"),
            email: String(values.get("new_client_email") ?? "").trim(),
            phone: String(values.get("new_client_phone") ?? "").trim(),
            billing_address: String(
              values.get("new_client_billing_address") ?? "",
            ).trim(),
          },
        };
        setClientLocked(true);
        const client = await saveClient(
          organizationId,
          clientRequest.current.id,
          clientRequest.current.input,
        );
        if (!client) throw new Error("Client save failed");
        input.client_id = client.id;
        input.client_name = client.name;
      }
      await createProject(organizationId, id, input);
      clientRequest.current = null;
      setClientLocked(false);
      setId(crypto.randomUUID());
      setCreating(false);
      requestAnimationFrame(() => newProjectButton.current?.focus());
      setSaved(true);
      setQuery("");
      setStatus("all");
      void projectQuery.refetch();
    } catch {
      setError("saveError");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="saved-projects project-register"
      aria-labelledby="saved-projects-title"
    >
      <ProjectRegisterHeader
        scheduleHref={`/workspace/${organizationId}/schedule`}
        action={
          owner && (
            <Button
              ref={newProjectButton}
              onClick={() => {
                setCreating(true);
                setSaved(false);
                setError(null);
              }}
            >
              <Plus size={15} />
              {t("newProject")}
            </Button>
          )
        }
      />
      {owner && (
        <Dialog
          open={creating}
          onOpenChange={(open) => {
            if (!open && !busy) closeCreation();
          }}
        >
          <DialogContent
            className="project-create-dialog"
            title={t("newProject")}
            description={
              locale === "fr"
                ? "Renseignez le client et les informations du chantier."
                : "Enter the client and site details."
            }
            closeLabel={c.cancel}
          >
            <form className="company-form" onSubmit={submit}>
              <fieldset disabled={busy} className="project-fields">
                <NewProjectFields org={organizationId} locked={clientLocked} />
                <div className="dialog-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      closeCreation();
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
          </DialogContent>
        </Dialog>
      )}
      {saved && <p role="status">{c.saved}</p>}
      {projectQuery.isError && projectQuery.data && (
        <p role="alert" className="error-message">
          {c.error}
        </p>
      )}
      <ProjectRegisterList
        projects={projects.map((project) => ({
          ...project,
          client: project.client_name,
          status: project.status as ProjectStatus,
          href: `/workspace/${organizationId}/projects/${project.id}`,
        }))}
        query={query}
        status={status}
        onQuery={setQuery}
        onStatus={setStatus}
        loading={loading}
        failed={failed}
        loadedOnly
        canCreate={owner}
        onRetry={() => void projectQuery.refetch()}
        more={
          hasMore && (
            <Button
              disabled={projectQuery.isFetchingNextPage}
              variant="outline"
              onClick={more}
            >
              {projectQuery.isFetchingNextPage ? c.loading : c.more}
            </Button>
          )
        }
      />
    </section>
  );
}
