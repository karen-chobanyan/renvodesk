import { ArrowLeft, Check, FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { EmptyState, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo-store";
import { formatMoney, useLocale } from "@/lib/i18n";
import { EstimateLines } from "./estimate-lines";
import { type EstimateLine, estimateTotal, initialLines } from "./model";
export function EstimatePage() {
  const { id } = useParams();
  return <EstimateEditor key={id} id={id ?? ""} />;
}
function EstimateEditor({ id }: { id: string }) {
  const { projects, drafts, saveDraft } = useDemo();
  const { t, locale } = useLocale();
  const p = projects.find((item) => item.id === id);
  const [lines, setLines] = useState<EstimateLine[]>(
    drafts[id] ?? (id === "maison-ixelles" ? initialLines : []),
  );
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const total = estimateTotal(lines);
  function update(lineId: string, patch: Partial<EstimateLine>) {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, ...patch } : line,
      ),
    );
    setDirty(true);
    setSaved(false);
  }
  if (!p)
    return (
      <EmptyState
        title={t("notFound")}
        description=""
        action={
          <Button asChild>
            <Link to="/projects">{t("home")}</Link>
          </Button>
        }
      />
    );
  return (
    <div className="page-enter">
      <Link className="back-link" to={`/projects/${id}`}>
        <ArrowLeft size={14} />
        {p.name}
      </Link>
      <PageHeader
        eyebrow={t("estimates")}
        title={t("estimateTitle")}
        description={t("estimateSubtitle")}
        action={
          <Button
            disabled={total === null || lines.length === 0}
            onClick={() => {
              saveDraft(id, lines);
              setDirty(false);
              setSaved(true);
            }}
          >
            <Check size={16} />
            {t("save")}
          </Button>
        }
      />
      <div className="estimate-paper">
        <div className="estimate-heading">
          <div className="document-heading">
            <span className="document-icon">
              <FileText size={24} />
            </span>
            <div>
              <h2>{t("estimateWork")}</h2>
              <p>
                {p.name} · {p.client}
              </p>
            </div>
          </div>
          <span className="status status-planning">
            <span />
            {t("draft")}
          </span>
        </div>
        <EstimateLines
          lines={lines}
          update={update}
          remove={(lineId) => {
            setLines((current) => current.filter((line) => line.id !== lineId));
            setDirty(true);
            setSaved(false);
          }}
        />
        <div className="estimate-add">
          <Button
            variant="ghost"
            onClick={() => {
              setLines((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  label: "newLine",
                  quantity: "1",
                  price: "0",
                  unit: "fixed",
                },
              ]);
              setDirty(true);
              setSaved(false);
            }}
          >
            <Plus size={16} />
            {t("addLine")}
          </Button>
        </div>
        {total === null && (
          <p className="error-message" role="alert">
            {t("errors")}
          </p>
        )}
        <div className="estimate-summary">
          <div>
            <span>{t("subtotal")}</span>
            <strong data-testid="estimate-total">
              {total === null ? "—" : formatMoney(total, locale)}
            </strong>
          </div>
          <p>{t("draftNotice")}</p>
        </div>
      </div>
      <div className="draft-footer">
        <span role="status">
          {saved ? (
            <>
              <Check size={14} />
              {t("saved")}
            </>
          ) : (
            t(dirty ? "unsaved" : "clean")
          )}
        </span>
        <span>{t("sessionNote")}</span>
      </div>
    </div>
  );
}
