import { MapPin } from "lucide-react";
import { PlanMark } from "@/components/shared";
import { ProjectCosts } from "@/features/costs/project-costs";
import { useLocale } from "@/lib/i18n";
import type { SavedProject } from "./project-service";
export function SavedProjectOverview({ project }: { project: SavedProject }) {
  const { t, locale } = useLocale();
  return (
    <ProjectCosts org={project.organization_id} project={project.id}>
      {" "}
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
    </ProjectCosts>
  );
}
