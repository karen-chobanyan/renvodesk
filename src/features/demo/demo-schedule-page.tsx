import { useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { taskCopy } from "@/features/tasks/task-copy";
import { addDays, dateLabel, weekStart } from "@/features/tasks/task-model";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { DemoTaskPanel } from "./demo-tasks";

export function DemoSchedulePage() {
  const { locale } = useLocale(),
    c = taskCopy[locale],
    d = useDemoCopy();
  const { base, company } = useDemo();
  const [mode, setMode] = useState<"week" | "overdue" | "undated">("week"),
    [start, setStart] = useState(() => weekStart(base)),
    [mine, setMine] = useState(false);
  return (
    <div className="schedule-workspace">
      <Link className="back-link" to="/projects">
        {c.back}
      </Link>
      <PageHeader
        eyebrow={company.name}
        title={c.schedule}
        description={c.scope}
      />
      <div className="schedule-controls">
        <fieldset className="section-tabs" aria-label={c.schedule}>
          {(["week", "overdue", "undated"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={mode === value ? "selected" : ""}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {c[value]}
            </button>
          ))}
        </fieldset>
        <label className="task-filter">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => setMine(e.target.checked)}
          />
          {d.myTasks}
        </label>
      </div>
      {mode === "week" && (
        <div className="week-toolbar">
          <div className="week-range">
            <strong aria-live="polite">
              {dateLabel(start, locale)} —{" "}
              {dateLabel(addDays(start, 6), locale)}
            </strong>
          </div>
          <div className="week-navigation">
            <Button
              variant="outline"
              onClick={() => setStart(addDays(start, -7))}
            >
              {c.previous}
            </Button>
            <Button
              variant="outline"
              onClick={() => setStart(addDays(start, 7))}
            >
              {c.next}
            </Button>
            <Button variant="ghost" onClick={() => setStart(weekStart(base))}>
              {c.today}
            </Button>
          </div>
        </div>
      )}
      <DemoTaskPanel filter={{ mode, start, mine }} />
    </div>
  );
}
