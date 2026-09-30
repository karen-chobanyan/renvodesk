import { ArrowUpRight, Check, CircleDot, FileText } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";
import { type CaseStepId, landingCaseCopy } from "./landing-case-copy";
import { type LandingLocale, landingCopy } from "./landing-copy";

type CaseCopy = (typeof landingCaseCopy)[LandingLocale];

const localeTag = (locale: LandingLocale) =>
  locale === "fr" ? "fr-BE" : "en-IE";

// Display only: every amount is an integer number of cents.
function money(cents: number, locale: LandingLocale) {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function LandingCase({ locale }: { locale: LandingLocale }) {
  const c = landingCaseCopy[locale];
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const step = c.steps[active];
  function select(index: number) {
    const next = (index + c.steps.length) % c.steps.length;
    setActive(next);
    tabs.current[next]?.focus();
  }
  function onKeyDown(event: KeyboardEvent) {
    const moves: Record<string, number> = {
      ArrowDown: active + 1,
      ArrowRight: active + 1,
      ArrowUp: active - 1,
      ArrowLeft: active - 1,
      Home: 0,
      End: c.steps.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(moves[event.key]);
  }
  return (
    <section
      className="landing-case landing-section"
      id="workflow"
      aria-labelledby="workflow-title"
    >
      <div className="landing-case-heading">
        <p className="landing-eyebrow">{c.eyebrow}</p>
        <h2 id="workflow-title">{c.title}</h2>
        <p>{c.intro}</p>
      </div>
      <div
        className="landing-case-steps"
        role="tablist"
        aria-label={c.stepsLabel}
        aria-orientation="vertical"
      >
        {c.steps.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`case-tab-${item.id}`}
            aria-selected={index === active}
            aria-controls="case-panel"
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={onKeyDown}
          >
            <span className="landing-case-number">{item.number}</span>
            <span className="landing-case-step">
              <span className="landing-case-phase">{item.phase}</span>
              <strong>{item.title}</strong>
              <span className="landing-case-text">{item.text}</span>
            </span>
          </button>
        ))}
      </div>
      <div
        className="landing-case-file"
        role="tabpanel"
        id="case-panel"
        aria-labelledby={`case-tab-${step.id}`}
      >
        <CaseFileHeader c={c} active={active} />
        <div className="landing-case-view" key={step.id}>
          <CaseView id={step.id} c={c} locale={locale} />
        </div>
        <p className="landing-case-caption">{c.file.caption}</p>
      </div>
      <a className="landing-text-link landing-case-link" href="/projects">
        {landingCopy[locale].demo}
        <ArrowUpRight size={18} />
      </a>
    </section>
  );
}

function CaseFileHeader({ c, active }: { c: CaseCopy; active: number }) {
  return (
    <header className="landing-case-file-header">
      <div>
        <p className="landing-case-file-label">{c.file.label}</p>
        <p className="landing-case-file-project">{c.file.project}</p>
        <p className="landing-case-file-place">{c.file.place}</p>
      </div>
      <ol className="landing-case-rail" aria-hidden="true">
        {c.steps.map((item, index) => (
          <li key={item.id} data-reached={index <= active}>
            {item.phase}
          </li>
        ))}
      </ol>
    </header>
  );
}

function CaseView({
  id,
  c,
  locale,
}: {
  id: CaseStepId;
  c: CaseCopy;
  locale: LandingLocale;
}) {
  if (id === "estimate") return <CaseEstimate c={c} locale={locale} />;
  if (id === "tasks") return <CaseTasks c={c} />;
  return <CaseCosts c={c} locale={locale} />;
}

function CaseEstimate({ c, locale }: { c: CaseCopy; locale: LandingLocale }) {
  const e = c.estimate;
  const lines = e.lines.map((line) => ({
    ...line,
    totalCents: line.quantity * line.unitCents,
  }));
  const total = lines.reduce((sum, line) => sum + line.totalCents, 0);
  return (
    <>
      <div className="landing-case-view-title">
        <h3>{e.title}</h3>
        <span className="landing-case-badge" data-state="done">
          <Check size={13} aria-hidden="true" />
          {e.status}
        </span>
      </div>
      <table className="landing-case-table">
        <thead>
          <tr>
            {e.columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.description}>
              <td>{line.description}</td>
              <td>
                {line.quantity} {line.unit}
              </td>
              <td>{money(line.unitCents, locale)}</td>
              <td>{money(line.totalCents, locale)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3}>
              {e.total}
            </th>
            <td>{money(total, locale)}</td>
          </tr>
        </tfoot>
      </table>
      <ul className="landing-case-events">
        <li>
          <FileText size={15} aria-hidden="true" />
          {e.pdf}
        </li>
        <li>
          <Check size={15} aria-hidden="true" />
          {e.decision}
        </li>
      </ul>
    </>
  );
}

function CaseTasks({ c }: { c: CaseCopy }) {
  const t = c.tasks;
  return (
    <>
      <div className="landing-case-view-title">
        <h3>{t.title}</h3>
        <span className="landing-case-period">{t.period}</span>
      </div>
      <ul className="landing-case-tasks">
        {t.rows.map((row) => (
          <li key={row.task}>
            <span className="landing-case-avatar" aria-hidden="true">
              {row.assignee.charAt(0)}
            </span>
            <span className="landing-case-task">
              <strong>{row.task}</strong>
              <span>
                {row.trade} · {row.assignee} · {row.date}
              </span>
            </span>
            <span className="landing-case-badge" data-state={row.state}>
              {row.state === "done" ? (
                <Check size={13} aria-hidden="true" />
              ) : (
                <CircleDot size={13} aria-hidden="true" />
              )}
              {row.status}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function CaseCosts({ c, locale }: { c: CaseCopy; locale: LandingLocale }) {
  const k = c.costs;
  const spent = k.rows.reduce((sum, row) => sum + row.cents, 0);
  const percent = Math.round((spent * 100) / k.budgetCents);
  const metrics = [
    [k.budget, k.budgetCents],
    [k.spent, spent],
    [k.remaining, k.budgetCents - spent],
  ] as const;
  return (
    <>
      <div className="landing-case-view-title">
        <h3>{k.title}</h3>
        <span className="landing-case-period">
          {new Intl.NumberFormat(localeTag(locale), {
            style: "percent",
          }).format(percent / 100)}{" "}
          {k.share}
        </span>
      </div>
      <dl className="landing-case-metrics">
        {metrics.map(([label, cents]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{money(cents, locale)}</dd>
          </div>
        ))}
      </dl>
      <div className="landing-case-meter" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <ul className="landing-case-costs">
        {k.rows.map((row) => (
          <li key={row.category}>
            <span>
              <strong>{row.category}</strong>
              {row.note}
            </span>
            <span>{money(row.cents, locale)}</span>
          </li>
        ))}
      </ul>
      <p className="landing-case-note">{k.note}</p>
    </>
  );
}
