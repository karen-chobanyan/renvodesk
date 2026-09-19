import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";
import { Link, useParams } from "react-router";
import {
  EmptyState,
  PageHeader,
  PlanMark,
  StatusBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo-store";
import { formatMoney, useLocale } from "@/lib/i18n";
import { forecastMargin } from "./data";
export function ProjectPage() {
  const { id } = useParams();
  const { projects } = useDemo();
  const { t, locale } = useLocale();
  const p = projects.find((item) => item.id === id);
  if (!p)
    return (
      <EmptyState
        title={t("notFound")}
        description=""
        action={
          <Button asChild>
            <Link to="/projects">{t("home")}</Link>
          </Button>
        }
      />
    );
  const amounts = [
    ["contract", p.budget],
    ["actual", p.actual],
    ["committed", p.committed],
    ["forecast", forecastMargin(p)],
  ] as const;
  return (
    <div className="page-enter">
      <Link className="back-link" to="/projects">
        <ArrowLeft size={14} />
        {t("back")}
      </Link>
      <PageHeader
        eyebrow={t("project")}
        title={p.name}
        description={`${p.client} · ${p.city}`}
        action={
          <Button asChild>
            <Link to={`/estimates/${p.id}`}>
              {t("allEstimates")}
              <ArrowUpRight size={16} />
            </Link>
          </Button>
        }
      />
      <div className="detail-status">
        <StatusBadge status={p.status} />
        <span>{t(p.phase)}</span>
      </div>
      <section className="metrics four" aria-label={t("figures")}>
        {amounts.map(([key, value]) => (
          <div key={key}>
            <span>{t(key)}</span>
            <strong>{formatMoney(value, locale)}</strong>
            <small>{t("excludingTax")}</small>
          </div>
        ))}
      </section>
      <div className="detail-grid">
        <section>
          <div className="section-heading">
            <h2>{t("overview")}</h2>
            <span className="muted">{t("sample")}</span>
          </div>
          <div className="financial-lines">
            <div>
              <span>{t("contract")}</span>
              <strong>{formatMoney(p.budget, locale)}</strong>
            </div>
            <div>
              <span>{t("actual")}</span>
              <strong>− {formatMoney(p.actual, locale)}</strong>
            </div>
            <div>
              <span>{t("committed")}</span>
              <strong>− {formatMoney(p.committed, locale)}</strong>
            </div>
            <div>
              <span>{t("toComplete")}</span>
              <strong>− {formatMoney(p.remaining, locale)}</strong>
            </div>
            <div className="financial-total">
              <span>{t("forecast")}</span>
              <strong>{formatMoney(forecastMargin(p), locale)}</strong>
            </div>
          </div>
          <p className="helper-text">{t("forecastNote")}</p>
          <div className="section-heading">
            <h2>{t("nextStep")}</h2>
          </div>
          <Link className="next-step-detail" to={`/estimates/${p.id}`}>
            <span>
              <strong>{t(p.next)}</strong>
              <small>{p.name}</small>
            </span>
            <ArrowUpRight size={18} />
          </Link>
        </section>
        <aside className="detail-aside">
          <div className={`detail-plan ${p.color}`}>
            <PlanMark large />
          </div>
          <h2>{t("projectDetails")}</h2>
          <dl>
            <dt>{t("client")}</dt>
            <dd>{p.client}</dd>
            <dt>{t("address")}</dt>
            <dd>
              <MapPin size={14} />
              {p.address}
            </dd>
            <dt>{t("manager")}</dt>
            <dd>Alex Morgan</dd>
            <dt>{t("phase")}</dt>
            <dd>{t(p.phase)}</dd>
          </dl>
        </aside>
      </div>
    </div>
  );
}
