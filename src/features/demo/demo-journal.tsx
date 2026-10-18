import {
  ClipboardCheck,
  Coins,
  FileText,
  FolderKanban,
  History,
} from "lucide-react";
import { useId, useState } from "react";
import { activityCopy } from "@/features/activity/activity-copy";
import { activityDay } from "@/features/activity/activity-model";
import { exactMoney } from "@/features/costs/cost-model";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { DEMO_USER } from "./demo-directory";
import {
  type DemoActivity,
  type DemoActivityCategory,
  say,
} from "./demo-types";

const icons = {
  tasks: ClipboardCheck,
  costs: Coins,
  documents: FileText,
  estimates: FileText,
  project: FolderKanban,
} satisfies Record<DemoActivityCategory, typeof History>;
const categories = [
  "all",
  "project",
  "tasks",
  "documents",
  "estimates",
  "costs",
] as const;

export function DemoJournal({
  projectId,
  compact = false,
}: {
  projectId: string;
  compact?: boolean;
}) {
  const { locale } = useLocale(),
    c = activityCopy[locale];
  const { activity, members } = useDemo();
  const [category, setCategory] = useState<(typeof categories)[number]>("all");
  const headingId = useId(),
    filterId = useId();
  const rows = activity
    .filter((row) => row.projectId === projectId)
    .filter((row) => category === "all" || row.category === category)
    .slice(0, compact ? 3 : undefined);
  const groups = new Map<string, DemoActivity[]>();
  for (const row of rows) {
    const day = activityDay(row.at, locale);
    groups.set(day, [...(groups.get(day) ?? []), row]);
  }
  const time = (at: string) =>
    new Date(at).toLocaleTimeString(locale === "fr" ? "fr-BE" : "en-IE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const actor = (id: string) =>
    id === DEMO_USER
      ? c.you
      : (members.find((m) => m.id === id)?.name ?? c.member);
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
        {!compact && (
          <div className="journal-toolbar">
            <div className="journal-filter">
              <label htmlFor={filterId}>{c.filter}</label>
              <select
                id={filterId}
                className="input"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as (typeof categories)[number])
                }
              >
                {categories.map((key) => (
                  <option key={key} value={key}>
                    {c[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
      {!rows.length && (
        <p className="project-empty">
          {category === "all" ? c.empty : c.emptyFilter}
        </p>
      )}
      {[...groups].map(([day, events]) => (
        <div className="journal-day" key={day}>
          <h3>{day}</h3>
          <ol>
            {events.map((row) => {
              const Icon = icons[row.category] ?? History;
              const title =
                c.events[row.event as keyof typeof c.events] ?? c.unknown;
              return (
                <li key={row.id}>
                  {!compact && <time dateTime={row.at}>{time(row.at)}</time>}
                  <span className="journal-icon">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div className="journal-entry">
                    <p className="journal-action">{title}</p>
                    {row.label && (
                      <p className="journal-label">{say(row.label, locale)}</p>
                    )}
                    {row.detail && (
                      <p className="journal-detail">
                        {say(row.detail, locale)}
                      </p>
                    )}
                    {row.amountCents !== null && (
                      <p className="journal-amount">
                        {exactMoney(BigInt(row.amountCents), locale)} · {c.tax}
                      </p>
                    )}
                    {compact && (
                      <p className="journal-meta">
                        <span>{actor(row.actor)}</span>
                        <span aria-hidden="true"> · </span>
                        <time dateTime={row.at}>{time(row.at)}</time>
                      </p>
                    )}
                  </div>
                  {!compact && (
                    <span className="journal-actor">{actor(row.actor)}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
