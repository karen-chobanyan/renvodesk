import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/features/auth/auth-page";
import { useAuth } from "@/features/auth/auth-provider";
import { formatMoney, useLocale } from "@/lib/i18n";
import { draftCopy } from "./draft-copy";
import { editorLines, type StoredLine, serializeLines } from "./draft-model";
import { EstimateLines } from "./estimate-lines";
import {
  getEstimate,
  type SavedEstimate,
  saveEstimate,
} from "./estimate-service";
import { type EstimateLine, estimateTotal } from "./model";
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
    <AuthLayout>
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
    </AuthLayout>
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
    if (busy || !serialized || !title.trim()) return;
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
      <p className="eyebrow">{t("draft")}</p>
      <h1>{current.title}</h1>
      <p className="page-description">{c.notice}</p>
      <fieldset className="project-fields" disabled={busy}>
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
        <div className="dialog-actions">
          <Button
            disabled={!title.trim() || !serialized || error === "conflict"}
            onClick={save}
          >
            {busy ? c.loading : t("save")}
          </Button>
        </div>
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
    </>
  );
}
