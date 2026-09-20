import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, useLocale } from "@/lib/i18n";
import { type EstimateLine, lineTotal } from "./model";
export function EstimateLines({
  lines,
  update,
  remove,
}: {
  lines: EstimateLine[];
  update: (id: string, patch: Partial<EstimateLine>) => void;
  remove: (id: string) => void;
}) {
  const { t, locale } = useLocale();
  return (
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
                  maxLength={500}
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
                  onChange={(e) => update(line.id, { price: e.target.value })}
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
                  onClick={() => remove(line.id)}
                >
                  <Trash2 size={15} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
