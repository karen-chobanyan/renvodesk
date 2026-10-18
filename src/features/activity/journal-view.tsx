import {
  ClipboardCheck,
  Coins,
  FileText,
  FolderKanban,
  History,
} from "lucide-react";
import {
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { activityCopy } from "./activity-copy";
import {
  type ActivityCategory,
  activityCategories,
  activityDay,
  groupSketchActivity,
} from "./activity-model";

export type JournalEntry = {
  id: string;
  at: string;
  category: string;
  event: string;
  entityId?: string;
  title: string;
  label: string;
  detail?: string;
  changes?: string;
  amount?: string;
  actor: string;
  actorId: string;
  target?: string | null;
  open?: () => void;
  actionLabel?: string;
};

/** This panel stays mounted between project tabs. Keep its reading position locally. */
export function useJournalPosition(active: boolean) {
  const saved = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!active) return;
    if (saved.current !== null)
      window.scrollTo({ top: saved.current, behavior: "instant" });
    const remember = () => {
      saved.current = window.scrollY;
    };
    window.addEventListener("scroll", remember, { passive: true });
    return () => window.removeEventListener("scroll", remember);
  }, [active]);
}

export function JournalView({
  rows,
  compact = false,
  owner = true,
  category,
  setCategory,
  loading,
  updating,
  error,
  retry,
  more,
  loadingMore,
  moreError,
  footer,
}: {
  rows: JournalEntry[];
  compact?: boolean;
  owner?: boolean;
  category: ActivityCategory;
  setCategory: (category: ActivityCategory) => void;
  loading?: boolean;
  updating?: boolean;
  error?: boolean;
  retry?: () => void;
  more?: () => void;
  loadingMore?: boolean;
  moreError?: boolean;
  footer?: ReactNode;
}) {
  const { locale } = useLocale(),
    c = activityCopy[locale];
  const heading = useId(),
    filter = useId();
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(
    () => new Set(),
  );
  const groups = new Map<string, JournalEntry[]>();
  for (const row of rows) {
    const day = activityDay(row.at, locale);
    groups.set(day, [...(groups.get(day) ?? []), row]);
  }
  const time = (at: string) =>
    new Date(at).toLocaleTimeString(locale === "fr" ? "fr-BE" : "en-IE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  function entry(row: JournalEntry) {
    const Icon =
      row.category === "tasks"
        ? ClipboardCheck
        : row.category === "costs"
          ? Coins
          : ["documents", "estimates"].includes(row.category)
            ? FileText
            : row.category === "project"
              ? FolderKanban
              : History;
    return (
      <li className="journal-row" key={row.id} data-journal-event={row.id}>
        <span className="journal-icon">
          <Icon size={16} aria-hidden="true" />
        </span>
        <div className="journal-entry">
          <p className="journal-label">{row.label || row.title}</p>
          {row.label && <p className="journal-action">{row.title}</p>}
          {row.detail && <p className="journal-detail">{row.detail}</p>}
          {row.amount && <p className="journal-amount">{row.amount}</p>}
          {!compact && row.changes && (
            <p className="journal-detail">{row.changes}</p>
          )}
          <p className="journal-meta">
            <span>{row.actor}</span>
            <span aria-hidden="true"> · </span>
            <time
              dateTime={row.at}
              title={new Date(row.at).toLocaleString(
                locale === "fr" ? "fr-BE" : "en-IE",
              )}
            >
              {time(row.at)}
            </time>
          </p>
        </div>
        {(row.open || row.target) &&
          (row.open ? (
            <button
              type="button"
              className="account-link journal-open"
              onClick={row.open}
              aria-label={`${row.actionLabel || c.open}: ${row.label || row.title}`}
            >
              {row.actionLabel || c.open}
            </button>
          ) : (
            <Link
              className="account-link journal-open"
              to={row.target as string}
              aria-label={`${row.actionLabel || c.open}: ${row.label || row.title}`}
            >
              {row.actionLabel || c.open}
            </Link>
          ))}
      </li>
    );
  }
  return (
    <section
      className={`project-journal${compact ? " project-journal-compact" : ""}`}
      aria-labelledby={heading}
    >
      <header className="journal-heading">
        <h2 id={heading}>{c.title}</h2>
        {!compact && <p className="helper-text">{c.description}</p>}
      </header>
      {!compact && (
        <div className="journal-toolbar">
          <label className="journal-filter" htmlFor={filter}>
            <span>{c.filter}</span>
            <select
              id={filter}
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value as ActivityCategory)}
            >
              {activityCategories
                .filter((key) => owner || !["costs", "estimates"].includes(key))
                .map((key) => (
                  <option key={key} value={key}>
                    {c[key]}
                  </option>
                ))}
            </select>
          </label>
          {category !== "all" && (
            <Button variant="ghost" onClick={() => setCategory("all")}>
              {c.reset}
            </Button>
          )}
          <p className="register-scope">
            {c.loaded}: {rows.length}
          </p>
        </div>
      )}
      {loading && (
        <p role="status" className="journal-notice">
          {c.loading}
        </p>
      )}
      {updating && !loading && !loadingMore && (
        <p role="status" className="journal-notice">
          {c.updating}
        </p>
      )}
      {error && (
        <div role="alert" className="journal-notice">
          <p>{rows.length ? c.refreshError : c.error}</p>
          <Button variant="outline" disabled={updating} onClick={retry}>
            {c.retry}
          </Button>
        </div>
      )}
      {!loading && !error && !rows.length && (
        <div className="document-empty">
          <strong>{category === "all" ? c.empty : c.emptyFilter}</strong>
          <p className="helper-text">
            {category === "all" ? c.emptyHint : c.emptyFilterHint}
          </p>
        </div>
      )}
      {[...groups].map(([day, events]) => (
        <div className="journal-day" key={day}>
          <h3>{day}</h3>
          <ol>
            {(compact
              ? events.map((row) => [row])
              : groupSketchActivity(events, locale)
            ).map((batch) =>
              batch.length === 1 ? (
                entry(batch[0])
              ) : (
                <li className="journal-revisions" key={batch[0].id}>
                  <details
                    open={batch.some((row) => expandedEvents.has(row.id))}
                    onToggle={(event) => {
                      const open = event.currentTarget.open;
                      setExpandedEvents((old) => {
                        if (batch.every((row) => old.has(row.id) === open))
                          return old;
                        const next = new Set(old);
                        for (const row of batch) {
                          if (open) next.add(row.id);
                          else next.delete(row.id);
                        }
                        return next;
                      });
                    }}
                  >
                    <summary>
                      <span>
                        <strong>{batch[0].label || batch[0].title}</strong>
                        <span>
                          {c.revisions.replace("{count}", String(batch.length))}
                        </span>
                        <small>
                          {batch[0].actor} ·{" "}
                          {time(batch.at(-1)?.at ?? batch[0].at)}–
                          {time(batch[0].at)}
                        </small>
                      </span>
                    </summary>
                    <ol>{batch.map(entry)}</ol>
                  </details>
                </li>
              ),
            )}
          </ol>
        </div>
      ))}
      {!compact && more && (
        <div className="journal-pagination">
          {moreError && <p role="alert">{c.moreError}</p>}
          <Button
            variant="outline"
            disabled={updating || loadingMore}
            onClick={more}
          >
            {loadingMore ? c.loading : moreError ? c.retry : c.older}
          </Button>
        </div>
      )}
      {footer && <footer className="journal-since">{footer}</footer>}
    </section>
  );
}
