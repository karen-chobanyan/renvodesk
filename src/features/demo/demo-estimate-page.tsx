import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { draftCopy } from "@/features/estimates/draft-copy";
import { EstimateLines } from "@/features/estimates/estimate-lines";
import { type EstimateLine, estimateTotal } from "@/features/estimates/model";
import { workflowCopy } from "@/features/estimates/workflow-copy";
import { useDemo } from "@/lib/demo-store";
import { formatMoney, useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { demoLines, demoPdfEstimate, editorLines } from "./demo-estimate-model";
import { DemoEstimateWorkflow } from "./demo-estimate-workflow";
import { type DemoEstimate, say, tx } from "./demo-types";

export function DemoEstimatePage() {
  const { id = "" } = useParams();
  const { estimates } = useDemo();
  const { locale, t } = useLocale();
  const d = useDemoCopy();
  const estimate = estimates.find((row) => row.id === id);
  if (!estimate) {
    // Older demo links used the project slug as the estimate identifier.
    const legacy = estimates.find((row) => row.projectId === id);
    if (legacy) return <Navigate replace to={`/estimates/${legacy.id}`} />;
    return (
      <EmptyState
        title={d.estimateMissing}
        description=""
        action={
          <Button asChild>
            <Link to="/estimates">{t("estimates")}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <DemoEstimateEditor key={`${estimate.id}:${locale}`} estimate={estimate} />
  );
}

function DemoEstimateEditor({ estimate }: { estimate: DemoEstimate }) {
  const { locale, t } = useLocale(),
    c = draftCopy[locale],
    w = workflowCopy[locale],
    d = useDemoCopy();
  const { projects, saveEstimate, company } = useDemo();
  const project = projects.find((p) => p.id === estimate.projectId);
  const [current, setCurrent] = useState(estimate);
  const [title, setTitle] = useState(say(estimate.title, locale));
  const [lines, setLines] = useState(() => editorLines(estimate.lines, locale));
  const [dirty, setDirty] = useState(false),
    [saved, setSaved] = useState(false),
    [pdfBusy, setPdfBusy] = useState(false),
    [pdfFailed, setPdfFailed] = useState(false);
  const frozen = current.status !== "draft";
  const total = estimateTotal(lines);
  function changed() {
    setDirty(true);
    setSaved(false);
  }
  function update(id: string, patch: Partial<EstimateLine>) {
    setLines((old) =>
      old.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
    changed();
  }
  function save() {
    const nextTitle =
      title.trim() === say(current.title, locale)
        ? current.title
        : tx(title.trim(), title.trim());
    const next = saveEstimate(
      current,
      nextTitle,
      demoLines(lines, current.lines, locale),
    );
    setCurrent(next);
    setDirty(false);
    setSaved(true);
  }
  async function downloadPdf() {
    if (!project) return;
    setPdfBusy(true);
    setPdfFailed(false);
    try {
      const { downloadEstimatePdf } = await import(
        "@/features/estimates/estimate-pdf"
      );
      await downloadEstimatePdf(
        demoPdfEstimate(current, project, company, locale),
        locale,
      );
    } catch {
      setPdfFailed(true);
    } finally {
      setPdfBusy(false);
    }
  }
  const invalid =
    total === null || lines.some((l) => !l.customDescription?.trim());
  return (
    <section className="connected-workspace live-estimate">
      <Link
        className="back-link"
        to={`/projects/${current.projectId}?tab=estimates`}
      >
        {project?.name ?? c.back}
      </Link>
      <p className="eyebrow">{w[current.status]}</p>
      <h1>{say(current.title, locale)}</h1>
      <p className="page-description">{frozen ? w.frozen : c.notice}</p>
      <div className="estimate-export">
        <Button
          variant="outline"
          disabled={pdfBusy || dirty || !project}
          onClick={() => void downloadPdf()}
        >
          {pdfBusy
            ? locale === "fr"
              ? "Préparation du PDF…"
              : "Preparing PDF…"
            : locale === "fr"
              ? "Télécharger le PDF"
              : "Download PDF"}
        </Button>
        <p className="helper-text">{d.pdfDemo}</p>
        {pdfFailed && (
          <p role="alert" className="error-message">
            {locale === "fr"
              ? "Impossible de générer le PDF. Réessayez."
              : "Could not generate the PDF. Try again."}
          </p>
        )}
      </div>
      <fieldset className="project-fields" disabled={frozen}>
        <label className="field" htmlFor="estimate-title">
          {c.title}
          <Input
            id="estimate-title"
            value={title}
            maxLength={120}
            onChange={(e) => {
              setTitle(e.target.value);
              changed();
            }}
          />
        </label>
        <div className="estimate-paper">
          <EstimateLines
            lines={lines}
            update={update}
            remove={(id) => {
              setLines((old) => old.filter((l) => l.id !== id));
              changed();
            }}
          />
          {!frozen && (
            <div className="estimate-add">
              <Button
                variant="ghost"
                disabled={lines.length >= 100}
                onClick={() => {
                  setLines((old) => [
                    ...old,
                    {
                      id: crypto.randomUUID(),
                      label: "newLine",
                      customDescription: t("newLine"),
                      quantity: "1",
                      price: "0",
                      unit: "fixed",
                    },
                  ]);
                  changed();
                }}
              >
                <Plus size={16} />
                {t("addLine")}
              </Button>
            </div>
          )}
          <div className="estimate-summary">
            <div>
              <span>{t("subtotal")}</span>
              <strong data-testid="estimate-total">
                {total === null ? "—" : formatMoney(total, locale)}
              </strong>
            </div>
            <p>{frozen ? w.pdfNotice : t("draftNotice")}</p>
          </div>
        </div>
        {invalid && (
          <p role="alert" className="error-message">
            {c.invalid}
          </p>
        )}
        {!frozen && (
          <div className="dialog-actions">
            <Button
              disabled={!title.trim() || invalid || !dirty}
              onClick={save}
            >
              <Check size={16} />
              {t("save")}
            </Button>
          </div>
        )}
      </fieldset>
      <p role="status">{saved ? t("saved") : dirty ? t("unsaved") : ""}</p>
      <DemoEstimateWorkflow
        estimate={current}
        dirty={dirty}
        empty={lines.length === 0}
        changed={setCurrent}
      />
    </section>
  );
}
