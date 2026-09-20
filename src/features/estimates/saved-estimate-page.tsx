import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import { formatMoney, useLocale } from "@/lib/i18n";
import { draftCopy } from "./draft-copy";
import { editorLines, type StoredLine, serializeLines } from "./draft-model";
import { EstimateLines } from "./estimate-lines";
import {
  estimateHistory,
  getEstimate,
  recordDecision,
  type SavedEstimate,
  saveEstimate,
} from "./estimate-service";
import { type DecisionEvent, EstimateWorkflow } from "./estimate-workflow";
import { ExportEstimate } from "./export-estimate";
import { type EstimateLine, estimateTotal } from "./model";
import { estimateStatus, workflowCopy } from "./workflow-copy";
export function SavedEstimatePage() {
  const { organizationId = "", id = "", estimateId = "" } = useParams(),
    { session } = useAuth();
  return (
    <Draft
      key={`${session?.user.id}:${organizationId}:${id}:${estimateId}`}
      org={organizationId}
      project={id}
      id={estimateId}
    />
  );
}
function Draft({
  org,
  project,
  id,
}: {
  org: string;
  project: string;
  id: string;
}) {
  const { locale } = useLocale(),
    c = draftCopy[locale];
  const [record, setRecord] = useState<SavedEstimate | null>(null),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit reload discards draft and fetches latest
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void getEstimate(org, project, id)
      .then((data) => {
        if (active) setRecord(data);
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
  }, [org, project, id, reload]);
  return (
    <AppShell live>
      <section className="connected-workspace live-estimate">
        <Link
          className="back-link"
          to={`/workspace/${org}/projects/${project}`}
        >
          {c.back}
        </Link>
        {loading ? (
          <p role="status">{c.loading}</p>
        ) : failed ? (
          <>
            <p role="alert">{c.error}</p>
            <Button onClick={() => setReload((n) => n + 1)}>{c.retry}</Button>
          </>
        ) : record ? (
          <Editor
            key={reload}
            record={record}
            reload={() => setReload((n) => n + 1)}
          />
        ) : (
          <p role="alert">{c.missing}</p>
        )}
      </section>
    </AppShell>
  );
}
function Editor({
  record,
  reload,
}: {
  record: SavedEstimate;
  reload: () => void;
}) {
  const { locale, t } = useLocale(),
    c = draftCopy[locale];
  const [current, setCurrent] = useState(record),
    [title, setTitle] = useState(record.title),
    [lines, setLines] = useState(() =>
      editorLines(record.lines as unknown as StoredLine[]),
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<"failed" | "conflict" | null>(null),
    [saved, setSaved] = useState(false),
    [dirty, setDirty] = useState(false);
  const [transitionLocked, setTransitionLocked] = useState(false),
    [events, setEvents] = useState<DecisionEvent[]>([]),
    [historyFailed, setHistoryFailed] = useState(false);
  const frozen = current.status !== "draft",
    w = workflowCopy[locale];
  async function refreshHistory() {
    try {
      setEvents(await estimateHistory(current));
      setHistoryFailed(false);
    } catch {
      setHistoryFailed(true);
    }
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh history on persisted revision changes
  useEffect(() => {
    void refreshHistory();
  }, [current.revision]);
  const serialized = serializeLines(lines),
    total = estimateTotal(lines);
  function changed() {
    setDirty(true);
    setSaved(false);
  }
  function update(id: string, patch: Partial<EstimateLine>) {
    setLines((old) => old.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    changed();
  }
  async function save() {
    if (busy || frozen || transitionLocked || !serialized || !title.trim())
      return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await saveEstimate(current, title.trim(), serialized);
      if (next) {
        setCurrent(next);
        setLines(editorLines(next.lines as unknown as StoredLine[]));
        setTitle(next.title);
        setDirty(false);
        setSaved(true);
      } else setError("conflict");
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="eyebrow">{w[estimateStatus(current.status)]}</p>
      <h1>{current.title}</h1>
      <p className="page-description">{frozen ? w.frozen : c.notice}</p>
      <ExportEstimate
        estimate={current}
        dirty={dirty}
        disabled={busy || !!error || transitionLocked}
      />
      <fieldset
        className="project-fields"
        disabled={busy || frozen || transitionLocked}
      >
        <label className="field" htmlFor="estimate-title">
          {c.title}
          <Input
            id="estimate-title"
            value={title}
            maxLength={120}
            onChange={(e) => {
              setTitle(e.target.value);
              changed();
            }}
          />
        </label>
        <div className="estimate-paper">
          <EstimateLines
            lines={lines}
            update={update}
            remove={(id) => {
              setLines((old) => old.filter((l) => l.id !== id));
              changed();
            }}
          />
          {!frozen && (
            <div className="estimate-add">
              <Button
                variant="ghost"
                disabled={lines.length >= 100}
                onClick={() => {
                  setLines((old) => [
                    ...old,
                    {
                      id: crypto.randomUUID(),
                      label: "newLine",
                      customDescription: "",
                      quantity: "1",
                      price: "0",
                      unit: "fixed",
                    },
                  ]);
                  changed();
                }}
              >
                {t("addLine")}
              </Button>
              {lines.length >= 100 && <p>{c.limit}</p>}
            </div>
          )}
          <div className="estimate-summary">
            <div>
              <span>{t("subtotal")}</span>
              <strong data-testid="saved-estimate-total">
                {total === null ? "—" : formatMoney(total, locale)}
              </strong>
            </div>
          </div>
        </div>
        {serialized === null && (
          <p role="alert" className="error-message">
            {c.invalid}
          </p>
        )}
        {!frozen && (
          <div className="dialog-actions">
            <Button
              disabled={!title.trim() || !serialized || error === "conflict"}
              onClick={save}
            >
              {busy ? c.loading : t("save")}
            </Button>
          </div>
        )}
      </fieldset>
      {error && (
        <div role="alert">
          <p className="error-message">{c[error]}</p>
          <Button variant="outline" disabled={busy} onClick={reload}>
            {c.reload}
          </Button>
        </div>
      )}
      <p role="status">{saved ? c.saved : dirty ? t("unsaved") : ""}</p>
      <EstimateWorkflow
        record={current}
        dirty={dirty}
        disabled={busy || !!error || transitionLocked}
        events={events}
        historyFailed={historyFailed}
        refresh={() => void refreshHistory()}
        transition={(request) => recordDecision(current, request)}
        changed={(next) => {
          setCurrent(next);
          setSaved(false);
        }}
        lock={setTransitionLocked}
        reload={reload}
      />
    </>
  );
}
