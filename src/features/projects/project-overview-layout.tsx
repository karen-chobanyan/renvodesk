import type { ReactNode } from "react";
import { Link } from "react-router";
import { useLocale } from "@/lib/i18n";
import { layoutCopy } from "./project-layout";
export function ProjectPreview({
  title,
  to,
  children,
}: {
  title: string;
  to: string;
  children: ReactNode;
}) {
  const { locale } = useLocale();
  return (
    <section className="project-preview">
      <div className="section-heading">
        <h2>{title}</h2>
        <Link
          className="account-link"
          to={to}
          aria-label={`${layoutCopy[locale].view} — ${title}`}
        >
          {layoutCopy[locale].view}
        </Link>
      </div>
      {children}
    </section>
  );
}
export function ProjectPreviewEmpty({
  text,
  action,
  to,
}: {
  text: string;
  action: string;
  to: string;
}) {
  return (
    <div className="project-empty">
      <p>{text}</p>
      <Link className="account-link" to={to}>
        {action}
      </Link>
    </div>
  );
}
