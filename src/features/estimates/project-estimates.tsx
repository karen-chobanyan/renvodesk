import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/auth-provider";
import { createEstimate, listEstimates } from "./estimate-service";
import { ProjectEstimateList } from "./project-estimate-list";
import { estimateStatus } from "./workflow-copy";
export function ProjectEstimates({
  organizationId,
  projectId,
  projectName,
  clientName,
}: {
  organizationId: string;
  projectId: string;
  projectName: string;
  clientName: string;
}) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { session } = useAuth();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listEstimates>>>(
    [],
  );
  const [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0),
    [more, setMore] = useState(false);
  const base = `/workspace/${organizationId}/projects/${projectId}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit retry invalidates query
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void listEstimates(organizationId, projectId)
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
  }, [organizationId, projectId, reload]);
  async function loadMore() {
    setLoading(true);
    try {
      const data = await listEstimates(organizationId, projectId, rows.length);
      setRows((old) => [
        ...old,
        ...data.filter((x) => !old.some((y) => y.id === x.id)),
      ]);
      setMore(data.length === 20);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <ProjectEstimateList
      project={{ id: projectId, name: projectName, client: clientName }}
      rows={rows.map((row) => ({
        id: row.id,
        title: row.title,
        revision: row.revision,
        status: estimateStatus(row.status),
        totalCents: row.total_cents,
        project: projectName,
        client: clientName,
        href: `${base}/estimates/${row.id}`,
        projectHref: base,
      }))}
      loading={loading}
      failed={failed}
      more={more}
      retry={() => setReload((n) => n + 1)}
      loadMore={loadMore}
      create={async (_project, title, id) => {
        const draft = await createEstimate(
          organizationId,
          projectId,
          id,
          title,
        );
        void client.invalidateQueries({
          queryKey: [
            "workspace",
            session?.user.id ?? "",
            organizationId,
            "estimates",
          ],
        });
        navigate(`${base}/estimates/${draft.id}`);
      }}
    />
  );
}
