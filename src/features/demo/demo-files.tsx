import { Sparkles } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { fileCopy } from "@/features/files/file-copy";
import { FileLibrary } from "@/features/files/file-library";
import { FileMoreActions } from "@/features/files/file-more-actions";
import { FileUploader } from "@/features/files/file-uploader";
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

export function DemoFiles({
  projectId,
  active = true,
}: {
  projectId: string;
  active?: boolean;
}) {
  const { locale } = useLocale(),
    c = fileCopy[locale],
    d = useDemoCopy();
  const { files } = useDemo();
  const rows = files.filter((f) => f.projectId === projectId);
  const [notice, setNotice] = useState(""),
    [preview, setPreview] = useState<DemoFile | null>(null),
    [review, setReview] = useState(false);
  const [analyzeFile, setAnalyzeFile] = useState<DemoFile | null>(null);
  const opener = useRef<Element | null>(null);
  function rememberFocus() {
    const el = document.activeElement;
    opener.current = el?.closest("details")?.querySelector("summary") ?? el;
  }
  function restoreFocus(event: Event) {
    if (opener.current instanceof HTMLElement && opener.current.isConnected) {
      event.preventDefault();
      opener.current.focus();
    }
  }
  useEffect(() => {
    if (!active) {
      setPreview(null);
      setReview(false);
      setAnalyzeFile(null);
    }
  }, [active]);
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
      </header>
      <FileUploader
        select={() => setNotice(d.uploadDemo)}
        choose={() => setNotice(d.uploadDemo)}
        capture={() => setNotice(d.captureDemo)}
        notice={notice && <p role="status">{notice}</p>}
      />
      <div className="document-library-heading">
        <h3>{c.library}</h3>
        <p className="register-scope">
          {projectDetailCopy[locale].loadedFiles}: {rows.length}
        </p>
      </div>
      {!rows.length ? (
        <div className="document-empty">
          <strong>{c.empty}</strong>
          <p className="helper-text">{c.emptyHint}</p>
        </div>
      ) : (
        <FileLibrary
          focusId={focusId}
          rows={rows.map((file) => ({
            id: file.id,
            name: file.name,
            size: file.sizeBytes,
          }))}
          actions={(id) => {
            const file = rows.find((file) => file.id === id);
            if (!file) return null;
            return (
              <>
                {file.kind === "audio" ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      rememberFocus();
                      setAnalyzeFile(file);
                    }}
                  >
                    <Sparkles size={16} aria-hidden="true" />
                    {c.analyze}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      rememberFocus();
                      setPreview(file);
                    }}
                  >
                    {file.kind === "dxf" ? c.openPlan : c.preview}
                  </Button>
                )}
                <FileMoreActions name={file.name}>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      file.url
                        ? download(file.url, file.name)
                        : setNotice(d.downloadUnavailable)
                    }
                  >
                    {c.download}
                  </Button>
                </FileMoreActions>
              </>
            );
          }}
        />
      )}
      <Dialog
        open={!!analyzeFile}
        onOpenChange={(open) => {
          if (!open) setAnalyzeFile(null);
        }}
      >
        <DialogContent
          title={c.analyzeTitle}
          description={analyzeFile?.name ?? ""}
          closeLabel={c.close}
          onCloseAutoFocus={restoreFocus}
        >
          <p className="helper-text">{d.aiDemo}</p>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setAnalyzeFile(null)}>
              {c.cancel}
            </Button>
            <Button
              onClick={() => {
                setAnalyzeFile(null);
                setReview(true);
              }}
            >
              {c.analyze}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
          onCloseAutoFocus={restoreFocus}
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
