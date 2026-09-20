import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getOrganization } from "@/features/organizations/organization-service";
import { getProject } from "@/features/projects/project-service";
import { useLocale } from "@/lib/i18n";
import type { StoredLine } from "./draft-model";
import { getEstimate, type SavedEstimate } from "./estimate-service";

const copy = {
  fr: {
    download: "Télécharger le PDF",
    loading: "Préparation du PDF…",
    dirty: "Enregistrez vos modifications avant l’export.",
    error: "Impossible de générer le PDF. Réessayez.",
    stale: "Le devis enregistré a changé. Rechargez la page avant l’export.",
  },
  en: {
    download: "Download PDF",
    loading: "Preparing PDF…",
    dirty: "Save your changes before exporting.",
    error: "Could not generate the PDF. Try again.",
    stale: "The saved estimate changed. Reload the page before exporting.",
  },
};
export function ExportEstimate({
  estimate,
  dirty,
  disabled,
}: {
  estimate: SavedEstimate;
  dirty: boolean;
  disabled: boolean;
}) {
  const { locale } = useLocale(),
    c = copy[locale];
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<"error" | "stale" | null>(null);
  async function download() {
    if (busy || dirty || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const [saved, company, project] = await Promise.all([
        getEstimate(estimate.organization_id, estimate.project_id, estimate.id),
        getOrganization(estimate.organization_id),
        getProject(estimate.organization_id, estimate.project_id),
      ]);
      if (!saved || !company || !project) throw new Error("Unavailable");
      if (saved.revision !== estimate.revision) {
        setError("stale");
        return;
      }
      const { downloadEstimatePdf } = await import("./estimate-pdf");
      await downloadEstimatePdf(
        {
          title: saved.title,
          revision: saved.revision,
          total_cents: saved.total_cents,
          lines: saved.lines as unknown as StoredLine[],
          company,
          project,
        },
        locale,
      );
    } catch {
      setError("error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="estimate-export">
      <Button
        variant="outline"
        disabled={busy || dirty || disabled}
        onClick={download}
      >
        {busy ? c.loading : c.download}
      </Button>
      {dirty && <p className="helper-text">{c.dirty}</p>}
      {error && (
        <p role="alert" className="error-message">
          {c[error]}
        </p>
      )}
    </div>
  );
}
