import { Link } from "react-router";
import { EmptyState, PageHeader, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activityCopy } from "@/features/activity/activity-copy";
import { costCopy } from "@/features/costs/cost-copy";
import { CostMetrics } from "@/features/costs/cost-summary";
import { fileCopy } from "@/features/files/file-copy";
import { useLocale } from "@/lib/i18n";
export function DesignPage() {
  const { t, locale } = useLocale();
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={t("design")}
        title={t("foundation")}
        description={t("foundationSubtitle")}
      />
      <section className="showcase-section">
        <h2>{t("tokens")}</h2>
        <p className="muted">{t("paletteNote")}</p>
        <div className="swatches">
          {(["canvas", "surface", "text", "accent"] as const).map((name) => (
            <div key={name}>
              <span style={{ background: `var(--${name})` }} />
              <strong>{t(name)}</strong>
              <code>--{name}</code>
            </div>
          ))}
        </div>
      </section>
      <section className="showcase-section">
        <h2>{t("actions")}</h2>
        <div className="component-row">
          <Button>{t("primary")}</Button>
          <Button variant="outline">{t("secondary")}</Button>
          <Button disabled>{t("disabled")}</Button>
        </div>
      </section>
      <section className="showcase-section">
        <h2>{t("form")}</h2>
        <label className="field showcase-field" htmlFor="showcase-name">
          {t("name")}
          <Input id="showcase-name" placeholder={t("example")} />
        </label>
      </section>
      <section className="showcase-section">
        <h2>{costCopy[locale].title}</h2>
        <CostMetrics
          summary={{
            budget_cents: 150000,
            budget_revision: 1,
            total: "123450",
            materials: "123450",
            labor: "0",
            subcontractors: "0",
            other: "0",
          }}
        />
        <p className="helper-text">{costCopy[locale].notice}</p>
        <Link className="account-link" to="/projects/maison-ixelles?tab=budget">
          {locale === "fr"
            ? "Voir le registre et les dialogues dans la démo"
            : "View the ledger and dialogs in the demo"}
        </Link>
      </section>
      <section className="showcase-section">
        <h2>{fileCopy[locale].title}</h2>
        <p className="helper-text">{fileCopy[locale].description}</p>
        <Link
          className="account-link"
          to="/projects/maison-ixelles?tab=documents"
        >
          {locale === "fr"
            ? "Voir l’import, les fichiers et les croquis dans la démo"
            : "View the uploader, files and sketches in the demo"}
        </Link>
      </section>
      <section className="showcase-section">
        <h2>{activityCopy[locale].title}</h2>
        <p className="helper-text">{activityCopy[locale].description}</p>
        <Link
          className="account-link"
          to="/projects/maison-ixelles?tab=activity"
        >
          {locale === "fr"
            ? "Voir le journal et ses filtres dans la démo"
            : "View the journal and its filters in the demo"}
        </Link>
      </section>
      <section className="showcase-section">
        <h2>{t("states")}</h2>
        <div className="component-row">
          <StatusBadge status="active" />
          <StatusBadge status="planning" />
          <StatusBadge status="completed" />
        </div>
        <EmptyState title={t("empty")} description={t("emptyText")} />
        <div className="state-examples">
          <div>
            <h3>{t("loading")}</h3>
            <div className="skeleton" />
            <div className="skeleton short" />
          </div>
          <div>
            <h3>{t("permissions")}</h3>
            <p>{t("permissionsText")}</p>
          </div>
          <div>
            <h3>{t("errors")}</h3>
            <Input
              aria-label={t("unitPrice")}
              aria-invalid="true"
              defaultValue="—"
            />
            <p className="error-message">{t("errors")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
