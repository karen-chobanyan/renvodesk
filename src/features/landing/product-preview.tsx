import {
  ArrowUpRight,
  Check,
  FileText,
  FolderKanban,
  MoreHorizontal,
} from "lucide-react";
import { type LandingLocale, landingCopy } from "./landing-copy";

export function ProductPreview({ locale }: { locale: LandingLocale }) {
  const c = landingCopy[locale].preview;
  return (
    <figure className="landing-product-preview">
      <div className="product-window">
        <div className="product-window-bar">
          <span className="product-window-dots">
            <i />
            <i />
            <i />
          </span>
          <span>RenvoDesk / {c.title}</span>
          <MoreHorizontal size={16} />
        </div>
        <div className="product-window-body">
          <div className="product-mini-sidebar" aria-hidden="true">
            <span className="mini-brand">r.</span>
            <FolderKanban size={17} />
            <FileText size={17} />
            <span className="mini-avatar">CL</span>
          </div>
          <div className="product-mini-main">
            <div className="product-mini-heading">
              <div>
                <h3>{c.title}</h3>
                <p>{c.location}</p>
              </div>
              <span className="product-mini-status">{c.status}</span>
            </div>
            <div className="product-mini-tabs" aria-hidden="true">
              {c.tabs.map((t, i) => (
                <span className={i === 0 ? "selected" : ""} key={t}>
                  {t}
                </span>
              ))}
            </div>
            <div className="product-mini-metrics">
              {[c.budget, c.spent, c.remaining].map((label, i) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{c.amounts[i]}</strong>
                </div>
              ))}
            </div>
            <p className="product-mini-tax">{c.tax}</p>
            <div className="product-mini-columns">
              <div className="product-mini-tasks">
                <h4>{c.next}</h4>
                <div>
                  <span className="mini-check">
                    <Check size={12} />
                  </span>
                  <p>
                    {c.task}
                    <small>{c.due}</small>
                  </p>
                </div>
                <div>
                  <span className="mini-check empty" />
                  <p>
                    {c.task2}
                    <small>{c.due}</small>
                  </p>
                </div>
                <div className="product-mini-estimate">
                  <FileText size={18} />
                  <span>
                    {c.estimate}
                    <small>{c.decision}</small>
                  </span>
                  <ArrowUpRight size={14} />
                </div>
              </div>
              <div className="product-mini-journal">
                <h4>{c.journal}</h4>
                <span className="mini-timeline-dot" />
                <strong>{c.event}</strong>
                <p>{c.filename}</p>
                <small>{c.time}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption>{c.caption}</figcaption>
    </figure>
  );
}
