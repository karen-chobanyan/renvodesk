import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { dateLabel } from "@/features/tasks/task-model";
import { useLocale } from "@/lib/i18n";
import { costCopy } from "./cost-copy";
import { type CostInput, categories, exactMoney } from "./cost-model";
import type { Summary } from "./cost-service";
import { CostMetrics } from "./cost-summary";

export type CostRow = CostInput & { id: string; voided: boolean };
export function CostReadError({
  message,
  retry,
  busy,
}: {
  message: string;
  retry: () => void;
  busy?: boolean;
}) {
  const { locale } = useLocale();
  return (
    <div className="cost-read-error" role="alert">
      <p>{message}</p>
      <Button variant="outline" disabled={busy} onClick={retry}>
        {costCopy[locale].retry}
      </Button>
    </div>
  );
}
export function CostLayout({
  summary,
  rows,
  add,
  editBudget,
  edit,
  voidRow,
  summaryState,
  listState,
  footer,
  loading = false,
}: {
  summary?: Summary;
  rows: CostRow[];
  add: () => void;
  editBudget: () => void;
  edit: (id: string) => void;
  voidRow: (id: string) => void;
  summaryState?: ReactNode;
  listState?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
}) {
  const { locale } = useLocale(),
    c = costCopy[locale];
  return (
    <section
      id="project-costs"
      aria-label={c.title}
      className="project-costs-workspace"
    >
      <div className="section-heading project-section-heading cost-toolbar">
        <h2>{c.title}</h2>
        <Button onClick={add}>{c.add}</Button>
      </div>
      {summaryState}
      {summary && <CostMetrics summary={summary} editBudget={editBudget} />}
      <p className="helper-text cost-notice">{c.notice}</p>
      <div className="cost-workspace-grid">
        <section className="cost-ledger" aria-label={c.actual}>
          <div className="cost-ledger-heading">
            <h3>{c.actual}</h3>
            <span className="helper-text">
              {rows.length} {c.loaded}
            </span>
          </div>
          {listState}
          {!rows.length && !loading && !listState && (
            <div className="cost-empty">
              <h3>{c.empty}</h3>
              <p className="muted">{c.emptyHint}</p>
            </div>
          )}
          {!!rows.length && (
            <table className="cost-table">
              <thead>
                <tr>
                  <th>{c.description}</th>
                  <th>{c.category}</th>
                  <th>{c.date}</th>
                  <th className="cost-amount">{c.amount}</th>
                  <th>
                    <span className="sr-only">{c.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`cost-row${row.voided ? " cost-row-voided" : ""}`}
                  >
                    <td className="cost-description">
                      <strong>{row.description}</strong>
                      {row.notes && <p>{row.notes}</p>}
                      {row.voided && (
                        <small>
                          {c.voided} · {c.excluded}
                        </small>
                      )}
                    </td>
                    <td data-label={c.category}>{c[row.category]}</td>
                    <td data-label={c.date}>
                      {dateLabel(row.incurred_on, locale)}
                    </td>
                    <td className="cost-amount" data-label={c.amount}>
                      {exactMoney(BigInt(row.amount_cents), locale)}
                    </td>
                    <td className="cost-row-actions">
                      {!row.voided && (
                        <>
                          <Button
                            variant="ghost"
                            onClick={() => edit(row.id)}
                            aria-label={`${c.edit} — ${row.description}`}
                          >
                            {c.edit}
                          </Button>
                          <details
                            className="file-more-actions"
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                event.stopPropagation();
                                event.currentTarget.open = false;
                                event.currentTarget
                                  .querySelector("summary")
                                  ?.focus();
                              }
                            }}
                          >
                            <summary
                              className="button button-ghost button-icon"
                              aria-label={`${c.actions} — ${row.description}`}
                            >
                              <MoreHorizontal size={18} />
                            </summary>
                            <div className="file-more-content">
                              <Button
                                variant="ghost"
                                onClick={(event) => {
                                  const details =
                                    event.currentTarget.closest("details");
                                  if (details) {
                                    details.open = false;
                                    details.querySelector("summary")?.focus();
                                  }
                                  voidRow(row.id);
                                }}
                              >
                                {c.void}
                              </Button>
                            </div>
                          </details>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {footer}
        </section>
        <aside className="cost-breakdown" aria-label={c.breakdown}>
          <h3>{c.breakdown}</h3>
          {summary ? (
            BigInt(summary.total) === 0n ? (
              <p className="helper-text">{c.emptyBreakdown}</p>
            ) : (
              <div className="financial-lines">
                {categories.map((category) => (
                  <div key={category}>
                    <span>{c[category]}</span>
                    <strong>
                      {exactMoney(BigInt(summary[category]), locale)}
                    </strong>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="helper-text">{c.unset}</p>
          )}
        </aside>
      </div>
    </section>
  );
}
