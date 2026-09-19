import { EmptyState, PageHeader, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
export function DesignPage() {
  const { t } = useLocale();
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
