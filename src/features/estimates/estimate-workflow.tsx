import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import type { SavedEstimate } from "./estimate-service";
import { estimateStatus, workflowCopy } from "./workflow-copy";
export type DecisionRequest = {
  id: string;
  revision: number;
  status: "sent" | "accepted" | "declined";
  note: string;
};
export type DecisionEvent = {
  id: string;
  to_status: string;
  note: string;
  recorded_at: string;
  from_revision: number;
};
export function EstimateWorkflow({
  record,
  dirty,
  disabled,
  events,
  historyFailed,
  refresh,
  transition,
  changed,
  lock,
  reload,
}: {
  record: SavedEstimate;
  dirty: boolean;
  disabled: boolean;
  events: DecisionEvent[];
  historyFailed: boolean;
  refresh: () => void;
  transition: (request: DecisionRequest) => Promise<SavedEstimate>;
  changed: (record: SavedEstimate) => void;
  lock: (locked: boolean) => void;
  reload: () => void;
}) {
  const { locale } = useLocale(),
    c = workflowCopy[locale];
  const [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<"failed" | "conflict" | null>(null);
  const request = useRef<DecisionRequest | null>(null);
  const status = estimateStatus(record.status),
    empty = Array.isArray(record.lines) && !record.lines.length;
  async function submit(target: DecisionRequest["status"]) {
    if (busy || (!request.current && (disabled || dirty || !note.trim())))
      return;
    if (!request.current) {
      if (!window.confirm(c.confirm)) return;
      request.current = {
        id: crypto.randomUUID(),
        revision: record.revision,
        status: target,
        note: note.trim(),
      };
    }
    setBusy(true);
    setError(null);
    lock(true);
    try {
      const next = await transition(request.current);
      changed(next);
      request.current = null;
      setNote("");
      lock(false);
    } catch (e) {
      setError(
        (e as { code?: string })?.code === "40001" ? "conflict" : "failed",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="company-form estimate-workflow">
      <h2>{c.heading}</h2>
      <p>{c.hint}</p>
      {status !== "draft" && <p>{c.frozen}</p>}
      {(status === "draft" || status === "sent") && (
        <>
          <label className="field" htmlFor="decision-note">
            {c.note}
            <textarea
              className="input"
              id="decision-note"
              maxLength={1000}
              placeholder={c.placeholder}
              value={note}
              disabled={busy || !!request.current || disabled}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {dirty && <p>{c.dirty}</p>}
          {status === "draft" && empty && <p>{c.empty}</p>}
          <div className="task-actions">
            {!request.current &&
              (status === "draft" ? (
                <Button
                  disabled={busy || disabled || dirty || empty || !note.trim()}
                  onClick={() => void submit("sent")}
                >
                  {c.send}
                </Button>
              ) : (
                <>
                  <Button
                    disabled={busy || disabled || dirty || !note.trim()}
                    onClick={() => void submit("accepted")}
                  >
                    {c.accept}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || disabled || dirty || !note.trim()}
                    onClick={() => void submit("declined")}
                  >
                    {c.decline}
                  </Button>
                </>
              ))}
            {error === "failed" && (
              <Button
                disabled={busy}
                onClick={() => {
                  if (request.current) void submit(request.current.status);
                }}
              >
                {c.retry}
              </Button>
            )}
            {busy && <p role="status">{c.loading}</p>}
          </div>
        </>
      )}
      {error && (
        <div role="alert">
          <p>{c[error]}</p>
          <Button variant="outline" disabled={busy} onClick={reload}>
            {c.reload}
          </Button>
        </div>
      )}
      <h3>{c.history}</h3>
      {historyFailed ? (
        <p role="alert">{c.historyError}</p>
      ) : events.length === 0 ? (
        <p>{c.noEvents}</p>
      ) : (
        <ol className="estimate-event-list">
          {events.map((event) => (
            <li key={event.id}>
              <strong>{c[estimateStatus(event.to_status)]}</strong>
              <p>{event.note}</p>
              <small>
                {c.recorded}{" "}
                {new Intl.DateTimeFormat(locale === "fr" ? "fr-BE" : "en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(event.recorded_at))}
              </small>
            </li>
          ))}
        </ol>
      )}
      <Button variant="outline" disabled={busy} onClick={refresh}>
        {c.refresh}
      </Button>
    </section>
  );
}
