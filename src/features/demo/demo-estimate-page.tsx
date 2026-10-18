import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { draftCopy } from "@/features/estimates/draft-copy";
import { editorCopy } from "@/features/estimates/editor-copy";
import {
  EstimateEditorActions,
  EstimateEditorHeader,
} from "@/features/estimates/estimate-editor-layout";
import { EstimateLines } from "@/features/estimates/estimate-lines";
import { type EstimateLine, estimateTotal } from "@/features/estimates/model";
import { useEstimateLeaveGuard } from "@/features/estimates/use-estimate-leave-guard";
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
  const { t } = useLocale();
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
  return <DemoEstimateEditor key={estimate.id} estimate={estimate} />;
}

function DemoEstimateEditor({ estimate }: { estimate: DemoEstimate }) {
  const { locale, t } = useLocale(),
    c = draftCopy[locale],
    e = editorCopy[locale],
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
  useEstimateLeaveGuard(dirty, e.leave);
  useEffect(() => {
    if (!dirty) {
      setTitle(say(current.title, locale));
      setLines(editorLines(current.lines, locale));
    }
  }, [locale, current, dirty]);
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
      <EstimateEditorHeader
        title={say(current.title, locale)}
        status={current.status}
        revision={current.revision}
        estimatesHref="/estimates"
        projectHref={`/projects/${current.projectId}?tab=estimates`}
        projectName={project?.name}
        notice={frozen ? w.frozen : c.notice}
      />
      <EstimateEditorActions
        message={
          frozen
            ? e.frozen
            : saved
              ? t("saved")
              : dirty
                ? t("unsaved")
                : e.saved
        }
      >
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
          {pdfFailed && (
            <p role="alert" className="error-message">
              {locale === "fr"
                ? "Impossible de générer le PDF. Réessayez."
                : "Could not generate the PDF. Try again."}
            </p>
          )}
        </div>
        {!frozen && (
          <Button disabled={!title.trim() || invalid || !dirty} onClick={save}>
            {t("save")}
          </Button>
        )}
      </EstimateEditorActions>
      <p className="helper-text demo-pdf-note">{d.pdfDemo}</p>
      <h2 className="estimate-section-title">{e.document}</h2>
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
            frozen={frozen}
            update={update}
            remove={(id) => {
              setLines((old) => old.filter((l) => l.id !== id));
              changed();
            }}
          />
          {!lines.length && <p className="estimate-lines-empty">{e.empty}</p>}
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
      </fieldset>

      <DemoEstimateWorkflow
        estimate={current}
        dirty={dirty}
        empty={lines.length === 0}
        changed={setCurrent}
      />
    </section>
  );
}
