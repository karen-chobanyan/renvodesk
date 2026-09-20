import { ArrowUpRight, MapPin } from "lucide-react";
import { PlanMark } from "@/components/shared";
import { formatMoney, useLocale } from "@/lib/i18n";
import type { SavedProject } from "./project-service";

// An explicitly fictional financial example, never derived from saved estimates.
const example = {
  contract: 8450000,
  actual: 3820000,
  committed: 1640000,
  remaining: 1200000,
  forecast: 1790000,
};
export function SavedProjectOverview({ project }: { project: SavedProject }) {
  const { t, locale } = useLocale();
  const notice =
    locale === "fr"
      ? "Exemple fictif — ces montants ne concernent pas votre projet. Le suivi financier n’est pas encore connecté."
      : "Fictional example — these amounts do not belong to your project. Financial tracking is not connected yet.";
  return (
    <>
      <section
        className="financial-preview"
        aria-label={
          locale === "fr"
            ? "Aperçu financier de démonstration"
            : "Demo financial preview"
        }
      >
        <div className="preview-disclosure">
          <span className="demo-chip">{t("demo")}</span>
          <p>{notice}</p>
        </div>
        <div className="metrics four">
          {(["contract", "actual", "committed", "forecast"] as const).map(
            (key) => (
              <div key={key}>
                <span>{t(key)}</span>
                <strong>{formatMoney(example[key], locale)}</strong>
                <small>
                  {t("sample")} · {t("excludingTax")}
                </small>
              </div>
            ),
          )}
        </div>
      </section>
      <div className="detail-grid">
        <section aria-labelledby="financial-overview-title">
          <div className="section-heading">
            <h2 id="financial-overview-title">{t("overview")}</h2>
            <span className="demo-chip">{t("sample")}</span>
          </div>
          <div className="financial-lines">
            {(
              [
                "contract",
                "actual",
                "committed",
                "remaining",
                "forecast",
              ] as const
            ).map((key) => (
              <div
                key={key}
                className={key === "forecast" ? "financial-total" : undefined}
              >
                <span>{t(key === "remaining" ? "toComplete" : key)}</span>
                <strong>
                  {key !== "contract" && key !== "forecast" ? "− " : ""}
                  {formatMoney(example[key], locale)}
                </strong>
              </div>
            ))}
          </div>
          <p className="helper-text">
            {t("forecastNote")} {t("sample")}.
          </p>
          <div className="section-heading">
            <h2>{t("nextStep")}</h2>
          </div>
          <a className="next-step-detail" href="#project-estimates">
            <span>
              <strong>
                {locale === "fr"
                  ? "Consulter les devis du projet"
                  : "Review project estimates"}
              </strong>
              <small>{project.name}</small>
            </span>
            <ArrowUpRight size={18} />
          </a>
        </section>
        <aside className="detail-aside">
          <div className="detail-plan sage">
            <PlanMark large />
          </div>
          <p className="helper-text">
            {locale === "fr"
              ? "Illustration de démonstration · aucun plan du chantier"
              : "Demo illustration · not a site drawing"}
          </p>
          <h2>{t("projectDetails")}</h2>
          <dl>
            <dt>{t("client")}</dt>
            <dd>{project.client_name}</dd>
            <dt>{t("address")}</dt>
            <dd>
              <MapPin size={14} />
              {project.address || project.city}
            </dd>
            <dt>{t("city")}</dt>
            <dd>{project.city}</dd>
            <dt>{t("status")}</dt>
            <dd>{t(project.status as "planning" | "active" | "completed")}</dd>
          </dl>
          <a className="account-link" href="#site-details">
            {locale === "fr" ? "Modifier les détails" : "Edit project details"}
          </a>
        </aside>
      </div>
    </>
  );
}
