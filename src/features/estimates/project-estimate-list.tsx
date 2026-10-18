import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { ProjectSectionHeading } from "@/features/projects/project-layout";
import { useLocale } from "@/lib/i18n";
import { draftCopy } from "./draft-copy";
import {
  EstimateCreateDialog,
  type EstimateProjectOption,
} from "./estimate-create-dialog";
import {
  type EstimateRegisterRow,
  EstimateRegisterTable,
} from "./estimate-register";
import { registerCopy } from "./register-copy";
export function ProjectEstimateList({
  project,
  rows,
  loading = false,
  failed = false,
  more = false,
  retry,
  loadMore,
  create,
}: {
  project: EstimateProjectOption;
  rows: EstimateRegisterRow[];
  loading?: boolean;
  failed?: boolean;
  more?: boolean;
  retry?: () => void;
  loadMore?: () => void;
  create: (project: string, title: string, id: string) => Promise<void>;
}) {
  const { locale } = useLocale(),
    c = draftCopy[locale],
    r = registerCopy[locale];
  const [creating, setCreating] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [search] = useSearchParams();
  const wantsNew =
    search.get("tab") === "estimates" && search.get("new") === "estimate";
  useEffect(() => {
    if (wantsNew) setCreating(true);
  }, [wantsNew]);
  return (
    <section
      id="project-estimates"
      className="saved-projects project-estimate-register"
      aria-label={c.heading}
    >
      <ProjectSectionHeading title={c.heading} description={r.recorded}>
        {retry && (
          <Button variant="ghost" disabled={loading} onClick={retry}>
            {locale === "fr" ? "Actualiser" : "Refresh"}
          </Button>
        )}
        <Button ref={trigger} onClick={() => setCreating(true)}>
          {c.new}
        </Button>
      </ProjectSectionHeading>
      {loading && <p role="status">{c.loading}</p>}
      {failed && (
        <div role="alert">
          <p>{c.error}</p>
          <Button onClick={retry} disabled={loading}>
            {c.retry}
          </Button>
        </div>
      )}
      {rows.length > 0 && (
        <EstimateRegisterTable rows={rows} showProject={false} />
      )}
      {!loading && !failed && !rows.length && (
        <div className="estimate-register-empty">
          <p>{c.empty}</p>
          <Button variant="outline" onClick={() => setCreating(true)}>
            {c.new}
          </Button>
        </div>
      )}
      <div className="estimate-register-footer">
        <p className="register-scope">
          {r.shown}: {rows.length}
        </p>
        {more && (
          <Button variant="outline" disabled={loading} onClick={loadMore}>
            {c.more}
          </Button>
        )}
      </div>
      {creating && (
        <EstimateCreateDialog
          projects={[project]}
          fixedProject={project}
          projectsHref="?tab=overview"
          trigger={trigger.current}
          close={() => setCreating(false)}
          create={create}
        />
      )}
    </section>
  );
}
