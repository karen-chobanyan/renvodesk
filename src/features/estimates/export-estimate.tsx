import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getOrganization } from "@/features/organizations/organization-service";
import { getProject } from "@/features/projects/project-service";
import { useLocale } from "@/lib/i18n";
import type { StoredLine } from "./draft-model";
import type { PdfEstimate } from "./estimate-pdf";
import { getEstimate, type SavedEstimate } from "./estimate-service";
import { estimateStatus } from "./workflow-copy";

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
      const saved = await getEstimate(
        estimate.organization_id,
        estimate.project_id,
        estimate.id,
      );
      if (!saved) throw new Error("Unavailable");
      if (saved.revision !== estimate.revision) {
        setError("stale");
        return;
      }
      const { downloadEstimatePdf } = await import("./estimate-pdf");
      if (saved.status !== "draft") {
        if (
          !saved.sent_snapshot ||
          typeof saved.sent_snapshot !== "object" ||
          Array.isArray(saved.sent_snapshot)
        )
          throw new Error("Snapshot unavailable");
        const snapshot = saved.sent_snapshot as unknown as PdfEstimate;
        await downloadEstimatePdf(
          { ...snapshot, status: estimateStatus(saved.status) },
          locale,
        );
      } else {
        const [company, project] = await Promise.all([
          getOrganization(estimate.organization_id),
          getProject(estimate.organization_id, estimate.project_id),
        ]);
        if (!company || !project) throw new Error("Unavailable");
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
      }
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
