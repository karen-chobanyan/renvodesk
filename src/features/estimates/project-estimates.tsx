import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, useLocale } from "@/lib/i18n";
import { draftCopy } from "./draft-copy";
import { createEstimate, listEstimates } from "./estimate-service";
import { estimateStatus, workflowCopy } from "./workflow-copy";
export function ProjectEstimates({
  organizationId,
  projectId,
}: {
  organizationId: string;
  projectId: string;
}) {
  const { locale } = useLocale(),
    c = draftCopy[locale],
    navigate = useNavigate();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listEstimates>>>(
    [],
  );
  const [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const [id] = useState(() => crypto.randomUUID());
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
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const title = String(
      new FormData(e.currentTarget).get("title") ?? "",
    ).trim();
    if (!title) return;
    setBusy(true);
    setError(false);
    try {
      const draft = await createEstimate(organizationId, projectId, id, title);
      navigate(`${base}/estimates/${draft.id}`);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
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
              disabled={busy}
            />
          </label>
          <Button disabled={busy}>{busy ? c.loading : c.create}</Button>
          {error && <p role="alert">{c.createError}</p>}
        </form>
      </details>
      {loading && <p role="status">{c.loading}</p>}
      {failed ? (
        <>
          <p role="alert">{c.error}</p>
          <Button onClick={() => setReload((n) => n + 1)}>{c.retry}</Button>
        </>
      ) : !loading && !rows.length ? (
        <p>{c.empty}</p>
      ) : null}
      <ul className="saved-project-list">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              className="saved-project-link"
              to={`${base}/estimates/${row.id}`}
            >
              {row.title}
            </Link>
            <span>
              {workflowCopy[locale][estimateStatus(row.status)]} ·{" "}
              {formatMoney(row.total_cents, locale)}
            </span>
          </li>
        ))}
      </ul>
      {more && !failed && (
        <Button variant="outline" disabled={loading} onClick={loadMore}>
          {c.more}
        </Button>
      )}
    </section>
  );
}
