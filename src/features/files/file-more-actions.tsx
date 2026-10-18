import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { projectDetailCopy } from "@/features/projects/project-detail-copy";
import { useLocale } from "@/lib/i18n";
export function FileMoreActions({
  children,
  name,
}: {
  children: ReactNode;
  name: string;
}) {
  const { locale } = useLocale();
  return (
    <details
      className="file-more-actions"
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("button")) {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        className="button button-ghost button-icon"
        aria-label={`${projectDetailCopy[locale].fileActions} — ${name}`}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </summary>
      <div className="file-more-content">{children}</div>
    </details>
  );
}
