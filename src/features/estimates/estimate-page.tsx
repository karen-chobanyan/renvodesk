import { ArrowLeft, Check, FileText, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { EmptyState, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/lib/demo-store";
import { formatMoney, useLocale } from "@/lib/i18n";
import {
  type EstimateLine,
  estimateTotal,
  initialLines,
  lineTotal,
} from "./model";
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
        <div className="table-scroll">
          <table className="estimate-table">
            <thead>
              <tr>
                <th>{t("description")}</th>
                <th>{t("quantity")}</th>
                <th>{t("unit")}</th>
                <th>{t("unitPrice")}</th>
                <th className="numeric">{t("total")}</th>
                <th>
                  <span className="sr-only">{t("deleteLine")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id}>
                  <td>
                    <Input
                      aria-label={`${t("description")} ${index + 1}`}
                      value={line.customDescription ?? t(line.label)}
                      onChange={(e) =>
                        update(line.id, { customDescription: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <Input
                      aria-label={`${t("quantity")} ${index + 1}`}
                      inputMode="decimal"
                      value={line.quantity}
                      aria-invalid={lineTotal(line) === null}
                      onChange={(e) =>
                        update(line.id, { quantity: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <select
                      className="input"
                      aria-label={`${t("unit")} ${index + 1}`}
                      value={line.unit}
                      onChange={(e) =>
                        update(line.id, {
                          unit: e.target.value as EstimateLine["unit"],
                        })
                      }
                    >
                      <option value="m²">m²</option>
                      <option value="item">{t("item")}</option>
                      <option value="fixed">{t("fixed")}</option>
                    </select>
                  </td>
                  <td>
                    <Input
                      aria-label={`${t("unitPrice")} ${index + 1}`}
                      inputMode="decimal"
                      value={line.price}
                      aria-invalid={lineTotal(line) === null}
                      onChange={(e) =>
                        update(line.id, { price: e.target.value })
                      }
                    />
                  </td>
                  <td className="numeric">
                    {lineTotal(line) === null
                      ? "—"
                      : formatMoney(lineTotal(line) ?? 0, locale)}
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${t("deleteLine")} ${index + 1}`}
                      onClick={() => {
                        setLines((current) =>
                          current.filter((item) => item.id !== line.id),
                        );
                        setDirty(true);
                        setSaved(false);
                      }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
