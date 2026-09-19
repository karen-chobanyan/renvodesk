import { FolderOpen } from "lucide-react";
import type { ReactNode } from "react";
import type { ProjectStatus } from "@/features/projects/data";
import { useLocale } from "@/lib/i18n";
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </header>
  );
}
export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useLocale();
  return (
    <span className={`status status-${status}`}>
      <span />
      {t(status)}
    </span>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <FolderOpen size={30} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function PlanMark({ large = false }: { large?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={large ? "plan-mark plan-large" : "plan-mark"}
      viewBox="0 0 120 100"
      fill="none"
    >
      <path d="M14 14H106V86H14V14Z" stroke="currentColor" strokeWidth="3" />
      <path
        d="M65 14V45M65 63V86M14 50H42M59 50H106M40 50V86"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M65 45A18 18 0 0 1 83 63H65M42 50A17 17 0 0 1 59 33V50"
        stroke="currentColor"
        strokeWidth=".8"
      />
      <path
        d="M24 24H49V38H24ZM77 22H96V35H77ZM72 72H96V78H72"
        fill="currentColor"
        opacity=".13"
      />
      <path
        d="M12 28H16V40H12ZM85 12H99V16H85ZM70 84H91V88H70Z"
        fill="var(--surface)"
        stroke="currentColor"
        strokeWidth=".8"
      />
    </svg>
  );
}
