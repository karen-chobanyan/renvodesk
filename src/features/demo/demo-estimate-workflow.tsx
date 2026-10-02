import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type EstimateStatus,
  workflowCopy,
} from "@/features/estimates/workflow-copy";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { type DemoEstimate, say } from "./demo-types";

export function DemoEstimateWorkflow({
  estimate,
  dirty,
  empty,
  changed,
}: {
  estimate: DemoEstimate;
  dirty: boolean;
  empty: boolean;
  changed: (next: DemoEstimate) => void;
}) {
  const { locale } = useLocale(),
    c = workflowCopy[locale],
    d = useDemoCopy();
  const { recordEstimate } = useDemo();
  const [note, setNote] = useState(""),
    [notice, setNotice] = useState(false);
  const status = estimate.status;
  function submit(next: EstimateStatus) {
    if (!note.trim() || !window.confirm(c.confirm)) return;
    changed(recordEstimate(estimate, next, note.trim()));
    setNote("");
    setNotice(true);
  }
  const blocked = dirty || !note.trim();
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
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {dirty && <p>{c.dirty}</p>}
          {status === "draft" && empty && <p>{c.empty}</p>}
          <div className="task-actions">
            {status === "draft" ? (
              <Button
                disabled={blocked || empty}
                onClick={() => submit("sent")}
              >
                {c.send}
              </Button>
            ) : (
              <>
                <Button disabled={blocked} onClick={() => submit("accepted")}>
                  {c.accept}
                </Button>
                <Button
                  variant="outline"
                  disabled={blocked}
                  onClick={() => submit("declined")}
                >
                  {c.decline}
                </Button>
              </>
            )}
          </div>
        </>
      )}
      {notice && <p role="status">{d.recorded}</p>}
      <h3>{c.history}</h3>
      {estimate.events.length === 0 ? (
        <p>{c.noEvents}</p>
      ) : (
        <ol className="estimate-event-list">
          {[...estimate.events].reverse().map((event) => (
            <li key={event.id}>
              <strong>{c[event.status]}</strong>
              <p>{say(event.note, locale)}</p>
              <small>
                {c.recorded}{" "}
                {new Intl.DateTimeFormat(locale === "fr" ? "fr-BE" : "en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(event.at))}
              </small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
