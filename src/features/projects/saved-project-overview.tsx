import { MapPin } from "lucide-react";
import { Link } from "react-router";
import { PlanMark } from "@/components/shared";
import { ProjectCosts } from "@/features/costs/project-costs";
import { useLocale } from "@/lib/i18n";
import type { SavedProject } from "./project-service";
export function SavedProjectOverview({
  project,
  owner,
}: {
  project: SavedProject;
  owner: boolean;
}) {
  const { t, locale } = useLocale();
  const details = (
    <aside className="detail-aside">
      {owner && (
        <>
          <div className="detail-plan sage">
            <PlanMark large />
          </div>
          <p className="helper-text">
            {locale === "fr"
              ? "Illustration de démonstration · aucun plan du chantier"
              : "Demo illustration · not a site drawing"}
          </p>
        </>
      )}
      <h2>{t("projectDetails")}</h2>
      <dl>
        <dt>{t("client")}</dt>
        <dd>{project.client_name}</dd>
        {owner && project.client_id && (
          <dd>
            <Link
              className="account-link"
              to={`/workspace/${project.organization_id}/clients`}
            >
              {locale === "fr" ? "Répertoire clients" : "Client directory"}
            </Link>
          </dd>
        )}
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
      {owner && (
        <a className="account-link" href="#site-details">
          {locale === "fr" ? "Modifier les détails" : "Edit project details"}
        </a>
      )}
    </aside>
  );
  return owner ? (
    <ProjectCosts org={project.organization_id} project={project.id}>
      {details}
    </ProjectCosts>
  ) : (
    <section className="member-project-details">{details}</section>
  );
}
