import type { ReactNode } from "react";
import { Link } from "react-router";
import { useLocale } from "@/lib/i18n";
import { editorCopy } from "./editor-copy";
import { type EstimateStatus, workflowCopy } from "./workflow-copy";
export function EstimateEditorHeader({
  title,
  status,
  revision,
  estimatesHref,
  projectHref,
  projectName,
  notice,
}: {
  title: string;
  status: EstimateStatus;
  revision: number;
  estimatesHref: string;
  projectHref: string;
  projectName?: string;
  notice: string;
}) {
  const { locale, t } = useLocale(),
    c = editorCopy[locale];
  return (
    <header className="estimate-editor-header">
      <nav className="estimate-breadcrumbs" aria-label={c.project}>
        <Link to={estimatesHref}>{t("estimates")}</Link>
        <span aria-hidden="true">/</span>
        <Link to={projectHref}>{projectName || c.project}</Link>
      </nav>
      <div className="estimate-editor-title">
        <h1 className="register-title">{title}</h1>
        <span
          className={`status estimate-status-${status}`}
          data-testid="estimate-status"
        >
          {workflowCopy[locale][status]}
        </span>
      </div>
      <p className="page-description">{notice}</p>
      <p className="helper-text">
        {c.revision} {revision}
      </p>
    </header>
  );
}
export function EstimateEditorActions({
  message,
  children,
}: {
  message: string;
  children: ReactNode;
}) {
  const { locale } = useLocale();
  return (
    <section
      className="estimate-editor-actions"
      aria-label={editorCopy[locale].actions}
    >
      <p role="status">{message}</p>
      <div className="estimate-editor-buttons">{children}</div>
    </section>
  );
}
