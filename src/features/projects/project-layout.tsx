import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { projectDetailCopy } from "./project-detail-copy";
export const projectTabs = [
  "overview",
  "tasks",
  "budget",
  "estimates",
  "documents",
  "activity",
] as const;
export type ProjectTab = (typeof projectTabs)[number];
export const layoutCopy = {
  fr: {
    overview: "Vue d’ensemble",
    activity: "Journal",
    tasks: "Tâches",
    budget: "Budget et coûts",
    estimates: "Devis",
    documents: "Documents",
    back: "Retour aux projets",
    edit: "Modifier les détails",
    next: "Prochaines tâches",
    emptyTasks:
      "Aucune tâche à réaliser. Préparez la prochaine étape du chantier.",
    recent: "Derniers devis",
    emptyEstimates: "Aucun devis. Créez le premier depuis l’onglet Devis.",
    sketches: "Croquis récents",
    emptySketches:
      "Aucun croquis. Dessinez votre première idée depuis Documents.",
    files: "Fichiers récents",
    emptyFiles: "Aucun fichier. Ajoutez vos documents de chantier.",
    recordVoiceNote: "Enregistrer une note vocale",
    view: "Tout voir",
    error: "Cette section est indisponible.",
    retry: "Réessayer",
    loading: "Chargement",
    undated: "Sans date",
    overdue: "En retard",
    close: "Fermer",
    leave: "Des modifications ne sont pas enregistrées. Les abandonner ?",
    schedule: "Ouvrir le planning de l’entreprise",
  },
  en: {
    overview: "Overview",
    activity: "Activity",
    tasks: "Tasks",
    budget: "Budget and costs",
    estimates: "Estimates",
    documents: "Documents",
    back: "Back to projects",
    edit: "Edit details",
    next: "Next tasks",
    emptyTasks: "No open tasks. Plan the next step for this site.",
    recent: "Latest estimates",
    emptyEstimates: "No estimates yet. Create the first in the Estimates tab.",
    sketches: "Recent sketches",
    emptySketches: "No sketches yet. Draw your first idea in Documents.",
    files: "Recent files",
    emptyFiles: "No files yet. Add your site documents.",
    recordVoiceNote: "Record voice note",
    view: "View all",
    error: "This section is unavailable.",
    retry: "Try again",
    loading: "Loading",
    undated: "Undated",
    overdue: "Overdue",
    close: "Close",
    leave: "You have unsaved changes. Discard them?",
    schedule: "Open company schedule",
  },
};
export function ProjectHeader({
  project,
  owner,
  edit,
  backHref,
}: {
  project: {
    name: string;
    status: string;
    client_name: string;
    address: string | null;
    city: string;
    organization_id?: string;
  };
  backHref?: string;
  owner: boolean;
  edit: () => void;
}) {
  const { locale } = useLocale(),
    c = layoutCopy[locale];
  return (
    <header className="project-header">
      <Link
        className="back-link"
        to={backHref ?? `/workspace?company=${project.organization_id}`}
      >
        {c.back}
      </Link>
      <div className="project-heading-row">
        <div>
          <div className="project-heading-title">
            <h1>{project.name}</h1>
            <StatusBadge
              status={project.status as "planning" | "active" | "completed"}
            />
          </div>
          <p>
            {project.client_name} ·{" "}
            {[project.address, project.city].filter(Boolean).join(" · ")}
          </p>
        </div>
        {owner && (
          <Button id="project-edit-details" variant="outline" onClick={edit}>
            {c.edit}
          </Button>
        )}
      </div>
    </header>
  );
}
export function ProjectNavigation({
  active,
  owner,
}: {
  active: ProjectTab;
  owner: boolean;
}) {
  const { locale } = useLocale(),
    c = layoutCopy[locale];
  const nav = useRef<HTMLElement>(null);
  const [overflow, setOverflow] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: labels and role change scroll width without resizing the container
  useEffect(() => {
    const container = nav.current;
    if (!container) return;
    const measure = () =>
      setOverflow(container.scrollWidth > container.clientWidth + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    measure();
    return () => observer.disconnect();
  }, [locale, owner]);
  useEffect(() => {
    const container = nav.current;
    const selected = container?.querySelector(`[href$="?tab=${active}"]`);
    if (!container || !selected) return;
    const viewport = container.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    if (item.left < viewport.left)
      container.scrollLeft += item.left - viewport.left;
    else if (item.right > viewport.right)
      container.scrollLeft += item.right - viewport.right;
  }, [active]);
  return (
    <div className="project-navigation">
      <nav
        ref={nav}
        className="project-tabs"
        aria-label={locale === "fr" ? "Sections du projet" : "Project sections"}
      >
        {projectTabs
          .filter((tab) => owner || !["budget", "estimates"].includes(tab))
          .map((tab) => (
            <Link
              key={tab}
              to={`?tab=${tab}`}
              aria-current={active === tab ? "page" : undefined}
            >
              {c[tab]}
            </Link>
          ))}
      </nav>
      {overflow && (
        <small className="project-tabs-hint">
          {projectDetailCopy[locale].moreSections}
        </small>
      )}
    </div>
  );
}
export function ProjectSkeleton() {
  const { locale } = useLocale();
  return (
    <div
      className="project-skeleton"
      role="status"
      aria-label={layoutCopy[locale].loading}
    >
      <span />
      <span />
      <span />
    </div>
  );
}

export function ProjectSectionHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="section-heading project-section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p className="page-description">{description}</p>}
      </div>
      <div className="task-actions">{children}</div>
    </header>
  );
}
