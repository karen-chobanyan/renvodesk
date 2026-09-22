import {
  ClipboardCheck,
  Coins,
  FileText,
  FolderKanban,
  History,
  RefreshCw,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { listTeam, type TeamMember } from "@/features/team/team-service";
import { useLocale } from "@/lib/i18n";
import { activityCopy } from "./activity-copy";
import {
  type Activity,
  type ActivityCategory,
  type ActivityCursor,
  activityCategories,
  activityDay,
  activityPresentation,
  activityTarget,
} from "./activity-model";
import { activityStartedAt, listActivity } from "./activity-service";

export function ProjectJournal({
  org,
  project,
  owner,
  compact = false,
  revision,
}: {
  org: string;
  project: string;
  owner: boolean;
  compact?: boolean;
  revision: number;
}) {
  const { session } = useAuth();
  // Scope every pending request and cached row to the current user/project/role.
  return (
    <Journal
      key={`${session?.user.id}:${org}:${project}:${owner}`}
      org={org}
      project={project}
      owner={owner}
      compact={compact}
      revision={revision}
    />
  );
}
function Journal({
  org,
  project,
  owner,
  compact,
  revision,
}: {
  org: string;
  project: string;
  owner: boolean;
  compact: boolean;
  revision: number;
}) {
  const { locale } = useLocale(),
    c = activityCopy[locale];
  const { session } = useAuth();
  const filterId = useId(),
    headingId = useId();
  const [category, setCategory] = useState<ActivityCategory>("all");
  const [rows, setRows] = useState<Activity[]>([]),
    [next, setNext] = useState<ActivityCursor | null>(null);
  const [started, setStarted] = useState<string | null>(null),
    [people, setPeople] = useState<TeamMember[]>([]);
  const [busy, setBusy] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0);
  const generation = useRef(0),
    loadingOlder = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision and reload invalidate the current feed; never remount working forms
  useEffect(() => {
    const current = ++generation.current;
    setBusy(true);
    setFailed(false);
    setRows([]);
    setNext(null);
    setStarted(null);
    loadingOlder.current = false;
    void Promise.all([
      listActivity(org, project, category, null, compact ? 5 : 20),
      activityStartedAt(),
      listTeam(org).catch(() => []),
    ])
      .then(([page, date, team]) => {
        if (current !== generation.current) return;
        setRows(page.rows);
        setNext(page.next);
        setStarted(date);
        setPeople(team);
      })
      .catch(() => {
        if (current === generation.current) setFailed(true);
      })
      .finally(() => {
        if (current === generation.current) setBusy(false);
      });
    return () => {
      generation.current++;
    };
  }, [org, project, category, compact, revision, reload]);
  async function older() {
    if (!next || loadingOlder.current || busy) return;
    const current = generation.current;
    loadingOlder.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const page = await listActivity(org, project, category, next);
      if (current !== generation.current) return;
      setRows((old) => [
        ...old,
        ...page.rows.filter((r) => !old.some((o) => o.id === r.id)),
      ]);
      setNext(page.next);
    } catch {
      if (current === generation.current) setFailed(true);
    } finally {
      if (current === generation.current) {
        setBusy(false);
        loadingOlder.current = false;
      }
    }
  }
  const groups = new Map<string, Activity[]>();
  for (const row of rows) {
    const day = activityDay(row.occurred_at, locale);
    groups.set(day, [...(groups.get(day) ?? []), row]);
  }
  return (
    <section
      className={`project-journal${compact ? " project-journal-compact" : ""}`}
      aria-labelledby={headingId}
    >
      <div className="journal-heading">
        <div>
          <h2 id={headingId}>{c.title}</h2>
          {!compact && <p>{c.description}</p>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={c.refresh}
          disabled={busy}
          onClick={() => setReload((n) => n + 1)}
        >
          <RefreshCw size={16} />
        </Button>
      </div>
      {!compact && (
        <div className="journal-filter">
          <label htmlFor={filterId}>{c.filter}</label>
          <select
            id={filterId}
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
        </div>
      )}
      {started && (
        <p className="journal-since">
          {c.since} {activityDay(started, locale)}.
        </p>
      )}
      {busy && (
        <p role="status" className="journal-notice">
          {c.loading}
        </p>
      )}
      {failed && (
        <div role="alert" className="journal-notice">
          <p>{c.error}</p>
          <Button
            variant="outline"
            onClick={() =>
              rows.length && next ? void older() : setReload((n) => n + 1)
            }
          >
            {c.retry}
          </Button>
        </div>
      )}
      {!busy && !failed && !rows.length && (
        <p className="project-empty">
          {category === "all" ? c.empty : c.emptyFilter}
        </p>
      )}
      {[...groups].map(([day, events]) => (
        <div className="journal-day" key={day}>
          <h3>{day}</h3>
          <ol>
            {events.map((row) => {
              const content = activityPresentation(row, locale),
                target = activityTarget(row);
              const Icon =
                row.category === "tasks"
                  ? ClipboardCheck
                  : row.category === "costs"
                    ? Coins
                    : row.category === "documents" ||
                        row.category === "estimates"
                      ? FileText
                      : row.category === "project"
                        ? FolderKanban
                        : History;
              const actor =
                row.actor_user_id === session?.user.id
                  ? c.you
                  : (people.find((p) => p.user_id === row.actor_user_id)
                      ?.email ?? c.member);
              return (
                <li key={row.id}>
                  <span className="journal-icon">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div className="journal-entry">
                    <p className="journal-action">{content.title}</p>
                    {content.label && (
                      <p className="journal-label">{content.label}</p>
                    )}
                    {content.detail && (
                      <p className="journal-detail">{content.detail}</p>
                    )}
                    {content.amount && (
                      <p className="journal-amount">{content.amount}</p>
                    )}
                    {!compact && content.changes && (
                      <p className="journal-detail">{content.changes}</p>
                    )}
                    <p className="journal-meta">
                      <span>{actor}</span>
                      <span aria-hidden="true"> · </span>
                      <time
                        dateTime={row.occurred_at}
                        title={new Date(row.occurred_at).toLocaleString(
                          locale === "fr" ? "fr-BE" : "en-IE",
                        )}
                      >
                        {new Date(row.occurred_at).toLocaleTimeString(
                          locale === "fr" ? "fr-BE" : "en-IE",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </time>
                    </p>
                    {target &&
                      (row.entity_type === "sketch" ? (
                        <a
                          className="account-link"
                          href={target}
                          aria-label={`${c.open}: ${content.label || content.title}`}
                        >
                          {c.open}
                        </a>
                      ) : (
                        <Link
                          className="account-link"
                          to={target}
                          aria-label={`${c.open}: ${content.label || content.title}`}
                        >
                          {c.open}
                        </Link>
                      ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      {!compact && next && !failed && (
        <Button variant="outline" disabled={busy} onClick={() => void older()}>
          {c.older}
        </Button>
      )}
    </section>
  );
}
