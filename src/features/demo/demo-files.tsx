import { Camera, FileText, Mic, Sparkles, Upload } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { fileCopy } from "@/features/files/file-copy";
import { FileMoreActions } from "@/features/files/file-more-actions";
import { projectDetailCopy } from "@/features/projects/project-detail-copy";
import { useProjectItemFocus } from "@/features/projects/use-project-item-focus";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { demoPdfEstimate } from "./demo-estimate-model";
import { DemoSiteNoteReview } from "./demo-site-note";
import type { DemoFile } from "./demo-types";

const DxfPreview = lazy(() => import("@/features/cad/dxf-preview"));
const PdfPreview = lazy(() => import("@/features/files/pdf-preview"));
const ImagePreview = lazy(() => import("@/features/files/image-preview"));

function download(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
}

/** Resolves a previewable URL; estimate PDFs are generated from demo data. */
function usePreviewUrl(file: DemoFile | null) {
  const { estimates, projects, company } = useDemo();
  const { locale } = useLocale();
  const [url, setUrl] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    setUrl("");
    setFailed(false);
    if (!file) return;
    if (file.url) {
      setUrl(file.url);
      return;
    }
    const estimate = estimates.find((e) => e.id === file.estimateId);
    const project = projects.find((p) => p.id === estimate?.projectId);
    if (!estimate || !project) return;
    let active = true,
      object = "";
    void import("@/features/estimates/estimate-pdf")
      .then(({ estimatePdfBlob }) =>
        estimatePdfBlob(
          demoPdfEstimate(estimate, project, company, locale),
          locale,
        ),
      )
      .then((blob) => {
        object = URL.createObjectURL(blob);
        if (active) setUrl(object);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (object) URL.revokeObjectURL(object);
    };
  }, [file, estimates, projects, company, locale]);
  return { url, failed };
}

export function DemoFiles({ projectId }: { projectId: string }) {
  const { locale } = useLocale(),
    c = fileCopy[locale],
    d = useDemoCopy();
  const { files } = useDemo();
  const rows = files.filter((f) => f.projectId === projectId);
  const [notice, setNotice] = useState(""),
    [preview, setPreview] = useState<DemoFile | null>(null),
    [review, setReview] = useState(false);
  const { url, failed } = usePreviewUrl(preview);
  const [search] = useSearchParams();
  const focusId = search.get("tab") === "documents" ? search.get("file") : null;
  useProjectItemFocus(
    focusId,
    rows.some((row) => row.id === focusId),
    "file",
  );
  const dialogClass =
    preview?.kind === "dxf"
      ? "dxf-dialog"
      : preview?.kind === "pdf"
        ? "pdf-dialog file-viewer-dialog"
        : preview?.kind === "image"
          ? "image-dialog file-viewer-dialog"
          : "";
  return (
    <section id="project-files" className="saved-projects project-files">
      <header className="document-section-heading">
        <div>
          <h2>{c.title}</h2>
          <p className="helper-text">{c.description}</p>
        </div>
        <Button onClick={() => setNotice(d.uploadDemo)}>
          <Upload size={16} aria-hidden="true" />
          {c.add}
        </Button>
      </header>
      <fieldset aria-label={c.choose} className="document-upload-shell">
        <div className="document-upload">
          <div className="document-drop-target">
            <p>
              {locale === "fr" ? "Déposez un fichier ici" : "Drop a file here"}
            </p>
            <p className="helper-text">{c.hint}</p>
          </div>
          <div className="capture-actions">
            <Button variant="outline" onClick={() => setNotice(d.captureDemo)}>
              <Camera size={18} aria-hidden="true" />
              {c.photo}
            </Button>
            <Button variant="outline" onClick={() => setNotice(d.captureDemo)}>
              <Mic size={18} aria-hidden="true" />
              {c.voice}
            </Button>
          </div>
        </div>
      </fieldset>
      {notice && <p role="status">{notice}</p>}
      {!rows.length ? (
        <p className="document-empty">{c.empty}</p>
      ) : (
        <>
          {rows.some((f) => f.kind === "audio") && (
            <p className="helper-text">{d.aiDemo}</p>
          )}
          <table className="document-file-table">
            <caption className="sr-only">{c.title}</caption>
            <thead>
              <tr>
                <th scope="col">{c.name}</th>
                <th scope="col">{c.type}</th>
                <th scope="col">{c.size}</th>
                <th scope="col">{c.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((file) => (
                <tr
                  key={file.id}
                  id={`file-${file.id}`}
                  tabIndex={-1}
                  data-selected={file.id === focusId || undefined}
                >
                  <td className="document-file-name">
                    <div className="document-file-info">
                      <FileText size={22} aria-hidden="true" />
                      <div>
                        <strong>{file.name}</strong>
                      </div>
                      <FileMoreActions name={file.name}>
                        <Button
                          variant="outline"
                          onClick={() =>
                            file.url
                              ? download(file.url, file.name)
                              : setNotice(d.downloadUnavailable)
                          }
                        >
                          {c.download}
                        </Button>
                      </FileMoreActions>
                    </div>
                  </td>
                  <td className="document-file-type">
                    {file.name.split(".").pop()?.toUpperCase()}
                  </td>
                  <td className="document-file-size">
                    {new Intl.NumberFormat(locale, {
                      maximumFractionDigits: 1,
                    }).format(file.sizeBytes / 1024)}{" "}
                    KiB
                  </td>
                  <td>
                    <div className="file-actions">
                      {file.kind === "audio" ? (
                        <Button
                          variant="outline"
                          onClick={() => setReview(true)}
                        >
                          <Sparkles size={16} aria-hidden="true" />
                          {c.analyze}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setPreview(file)}
                        >
                          {file.kind === "dxf" ? c.openPlan : c.preview}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <p className="register-scope">
        {projectDetailCopy[locale].loadedFiles}: {rows.length}
      </p>
      {review && (
        <DemoSiteNoteReview
          projectId={projectId}
          close={() => setReview(false)}
        />
      )}
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent
          className={dialogClass}
          title={preview?.name ?? c.preview}
          description={
            preview?.kind === "dxf"
              ? locale === "fr"
                ? "Plan DXF en lecture seule"
                : "Read-only DXF plan"
              : c.previewHint
          }
          closeLabel={c.close}
        >
          {failed ? (
            <p role="alert">{c.error}</p>
          ) : !url || !preview ? (
            <p role="status">{c.loading}</p>
          ) : (
            <Suspense fallback={<p role="status">{c.loading}</p>}>
              {preview.kind === "dxf" ? (
                <DxfPreview key={url} url={url} />
              ) : preview.kind === "pdf" ? (
                <PdfPreview
                  key={url}
                  url={url}
                  title={preview.name}
                  onDownload={() => download(url, preview.name)}
                  downloading={false}
                  downloadError={false}
                />
              ) : (
                <ImagePreview
                  key={url}
                  url={url}
                  title={preview.name}
                  onDownload={() => download(url, preview.name)}
                  downloading={false}
                  downloadError={false}
                  onError={() => setNotice(c.error)}
                />
              )}
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
