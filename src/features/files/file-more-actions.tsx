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
        aria-label={`${projectDetailCopy[locale].fileActions} — ${name}`}
      >
        {projectDetailCopy[locale].fileActions}
      </summary>
      <div className="file-more-content">{children}</div>
    </details>
  );
}
