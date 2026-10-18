import {
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVolume,
  Ruler,
} from "lucide-react";
import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n";
import { fileCopy } from "./file-copy";

export type LibraryFile = {
  id: string;
  name: string;
  size: number;
  status?: string;
  error?: ReactNode;
};
export function FileLibrary({
  rows,
  focusId,
  actions,
}: {
  rows: LibraryFile[];
  focusId?: string | null;
  actions: (id: string) => ReactNode;
}) {
  const { locale } = useLocale(),
    c = fileCopy[locale];
  return (
    <table className="document-file-table">
      <caption className="sr-only">{c.title}</caption>
      <thead>
        <tr>
          <th scope="col">{c.name}</th>
          <th scope="col">{c.type}</th>
          <th scope="col">{c.size}</th>
          <th scope="col">
            <span className="sr-only">{c.actions}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((file) => {
          const extension = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
          const Icon = ["JPG", "JPEG", "PNG", "WEBP"].includes(extension)
            ? FileImage
            : ["WEBM", "M4A", "OGG"].includes(extension)
              ? FileVolume
              : extension === "DXF"
                ? Ruler
                : extension === "XLSX"
                  ? FileSpreadsheet
                  : FileText;
          return (
            <tr
              key={file.id}
              id={`file-${file.id}`}
              tabIndex={-1}
              data-selected={file.id === focusId || undefined}
            >
              <td className="document-file-name">
                <div className="document-file-info">
                  <Icon size={22} aria-hidden="true" />
                  <div>
                    <strong>{file.name}</strong>
                    {file.status && (
                      <p className="document-file-state">{file.status}</p>
                    )}
                  </div>
                </div>
                {file.error}
              </td>
              <td className="document-file-type" data-label={c.type}>
                {extension}
              </td>
              <td className="document-file-size" data-label={c.size}>
                {new Intl.NumberFormat(locale, {
                  maximumFractionDigits: 1,
                }).format(file.size / 1024)}{" "}
                KiB
              </td>
              <td className="document-file-actions">
                <div className="file-actions">{actions(file.id)}</div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
