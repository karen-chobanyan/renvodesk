import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { teamCopy } from "@/features/team/team-copy";
import { useLocale } from "@/lib/i18n";
import { taskCopy } from "./task-copy";
import { addDays, dateLabel, onDay, weekStart } from "./task-model";

export type ScheduleMode = "week" | "overdue" | "undated";

export function ScheduleHeader() {
  const { locale } = useLocale();
  const c = taskCopy[locale];
  return (
    <header className="project-register-header">
      <div>
        <h1 className="register-title">{c.schedule}</h1>
        <p className="page-description">{c.scope}</p>
      </div>
    </header>
  );
}

export function ScheduleControls({
  mode,
  onMode,
  mine,
  onMine,
  start,
  onStart,
  day,
}: {
  mode: ScheduleMode;
  onMode: (mode: ScheduleMode) => void;
  mine: boolean;
  onMine: (mine: boolean) => void;
  start: string;
  onStart: (start: string) => void;
  day: string;
}) {
  const { locale } = useLocale();
  const c = taskCopy[locale];
  const week = weekStart(day);
  const range = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatRange(
    new Date(`${start}T12:00:00Z`),
    new Date(`${addDays(start, 6)}T12:00:00Z`),
  );
  return (
    <>
      <div className="schedule-controls">
        <fieldset
          className="section-tabs register-status"
          aria-label={c.schedule}
        >
          {(["week", "overdue", "undated"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={mode === value ? "selected" : ""}
              aria-pressed={mode === value}
              onClick={() => onMode(value)}
            >
              {c[value]}
            </button>
          ))}
        </fieldset>
        <label className="task-filter">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => onMine(e.target.checked)}
          />
          {teamCopy[locale].myTasks}
        </label>
      </div>
      {mode === "week" && (
        <div className="week-toolbar">
          <strong className="week-range" aria-live="polite">
            {range}
          </strong>
          <div className="week-navigation">
            <Button
              variant="outline"
              aria-label={c.previous}
              title={c.previous}
              disabled={start <= "1900-01-08"}
              onClick={() => onStart(addDays(start, -7))}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              onClick={() => onStart(week)}
              disabled={start === week}
            >
              {c.today}
            </Button>
            <Button
              variant="outline"
              aria-label={c.next}
              title={c.next}
              disabled={start >= "2100-12-24"}
              onClick={() => onStart(addDays(start, 7))}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export function ScheduleEmpty({
  mode,
  mine,
  projectsHref,
  onClearMine,
}: {
  mode: ScheduleMode;
  mine: boolean;
  projectsHref: string;
  onClearMine?: () => void;
}) {
  const { locale } = useLocale();
  const c = taskCopy[locale];
  return (
    <div
      className={`schedule-empty${mode === "week" ? " schedule-empty-week" : ""}`}
    >
      <CalendarDays size={24} aria-hidden="true" />
      <h3>{mine ? c.mineEmpty : c[`${mode}Empty`]}</h3>
      <p>{c[`${mode}EmptyHint`]}</p>
      {mine && onClearMine ? (
        <Button
          variant="outline"
          onClick={(event) => {
            const checkbox = event.currentTarget
              .closest(".schedule-workspace")
              ?.querySelector<HTMLInputElement>(".task-filter input");
            onClearMine();
            checkbox?.focus();
          }}
        >
          {c.allTasks}
        </Button>
      ) : (
        <Button variant="outline" asChild>
          <Link to={projectsHref}>{c.viewProjects}</Link>
        </Button>
      )}
    </div>
  );
}

export function TaskDates({
  start,
  due,
}: {
  start: string | null;
  due: string | null;
}) {
  const { locale } = useLocale();
  const c = taskCopy[locale];
  const date = start ?? due;
  if (!date) return <small className="task-dates">{c.noDates}</small>;
  return (
    <small className="task-dates">
      {start && due && start !== due ? (
        <>
          <time dateTime={start}>{dateLabel(start, locale)}</time> –{" "}
          <time dateTime={due}>{dateLabel(due, locale)}</time>
        </>
      ) : (
        <>
          {!start ? `${c.due}: ` : !due ? `${c.start}: ` : ""}
          <time dateTime={date}>{dateLabel(date, locale)}</time>
        </>
      )}
    </small>
  );
}

export function ScheduleWeek<
  T extends { start_date: string | null; due_date: string | null },
>({
  start,
  day,
  rows,
  loading = false,
  item,
}: {
  start: string;
  day: string;
  rows: T[];
  loading?: boolean;
  item: (row: T) => ReactNode;
}) {
  const { locale } = useLocale();
  const c = taskCopy[locale];
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  return (
    <div className="week-grid" aria-busy={loading}>
      {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((date) => {
        const dayRows = rows.filter((row) => onDay(row, date));
        return (
          <section
            key={date}
            className={`week-day${date === day ? " is-today" : ""}${dayRows.length === 0 ? " is-empty" : ""}`}
          >
            <h3 className="calendar-day-heading">
              <time
                dateTime={date}
                aria-current={date === day ? "date" : undefined}
              >
                <span>{weekday.format(new Date(`${date}T12:00:00Z`))}</span>
                <strong>{Number(date.slice(8))}</strong>
                {date === day && (
                  <em className="calendar-today-label">{c.currentDay}</em>
                )}
              </time>
            </h3>
            {!loading && rows.length > 0 && dayRows.length === 0 && (
              <p className="calendar-day-empty">{c.dayEmpty}</p>
            )}
            {dayRows.map(item)}
          </section>
        );
      })}
    </div>
  );
}
