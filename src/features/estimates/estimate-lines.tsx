import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, useLocale } from "@/lib/i18n";
import { editorCopy } from "./editor-copy";
import { type EstimateLine, lineTotal } from "./model";
export function EstimateLines({
  lines,
  update,
  remove,
  frozen = false,
}: {
  lines: EstimateLine[];
  update: (id: string, patch: Partial<EstimateLine>) => void;
  remove: (id: string) => void;
  frozen?: boolean;
}) {
  const { t, locale } = useLocale();
  const c = editorCopy[locale];
  return (
    <div className="table-scroll estimate-lines-scroll">
      <table className="estimate-table" aria-label={c.lines}>
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
              <td className="estimate-line-description">
                <span className="estimate-line-label">
                  {c.line} {index + 1} · {t("description")}
                </span>
                <textarea
                  className="input estimate-description-input"
                  rows={2}
                  aria-label={`${t("description")} ${index + 1}`}
                  aria-invalid={
                    !(line.customDescription ?? t(line.label)).trim()
                  }
                  maxLength={500}
                  value={line.customDescription ?? t(line.label)}
                  onChange={(e) =>
                    update(line.id, { customDescription: e.target.value })
                  }
                />
                {(lineTotal(line) === null ||
                  !(line.customDescription ?? t(line.label)).trim()) && (
                  <small
                    className="error-message estimate-line-error"
                    id={`line-error-${line.id}`}
                  >
                    {c.invalidLine}
                  </small>
                )}
              </td>
              <td className="estimate-line-quantity">
                <span className="estimate-line-label">{t("quantity")}</span>
                <Input
                  aria-label={`${t("quantity")} ${index + 1}`}
                  inputMode="decimal"
                  value={line.quantity}
                  aria-invalid={lineTotal(line) === null}
                  aria-describedby={
                    lineTotal(line) === null
                      ? `line-error-${line.id}`
                      : undefined
                  }
                  onChange={(e) =>
                    update(line.id, { quantity: e.target.value })
                  }
                />
              </td>
              <td className="estimate-line-unit">
                <span className="estimate-line-label">{t("unit")}</span>
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
              <td className="estimate-line-price">
                <span className="estimate-line-label">{t("unitPrice")}</span>
                <Input
                  aria-label={`${t("unitPrice")} ${index + 1}`}
                  inputMode="decimal"
                  value={line.price}
                  aria-invalid={lineTotal(line) === null}
                  aria-describedby={
                    lineTotal(line) === null
                      ? `line-error-${line.id}`
                      : undefined
                  }
                  onChange={(e) => update(line.id, { price: e.target.value })}
                />
              </td>
              <td className="numeric estimate-line-total">
                <span className="estimate-line-label">{t("total")}</span>
                {lineTotal(line) === null
                  ? "—"
                  : formatMoney(lineTotal(line) ?? 0, locale)}
              </td>
              <td className="estimate-line-remove">
                {!frozen && (
                  <Button
                    variant="ghost"
                    aria-label={`${t("deleteLine")} ${index + 1}`}
                    onClick={() => remove(line.id)}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    <span className="estimate-line-label">{c.remove}</span>
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
