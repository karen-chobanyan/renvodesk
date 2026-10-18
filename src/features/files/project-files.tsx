import { useQueryClient } from "@tanstack/react-query";
import { Camera, FileText, Mic, Sparkles, Upload } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { projectDetailCopy } from "@/features/projects/project-detail-copy";
import { useProjectItemFocus } from "@/features/projects/use-project-item-focus";
import { quotaErrorCode } from "@/features/storage-usage/storage-model";
import { useLocale } from "@/lib/i18n";
import { fileCopy } from "./file-copy";
import { canPreview, PREVIEW_URL_SECONDS, validateFile } from "./file-model";
import { FileMoreActions } from "./file-more-actions";
import {
  confirmUpload,
  deleteFile,
  downloadFile,
  getProjectFile,
  listFiles,
  type ProjectFile,
  previewUrl,
  reserveFile,
  uploadFile,
} from "./file-service";

import { MediaCapture } from "./media-capture";
import {
  SiteNoteAnalysisNotices,
  useSiteNoteAnalysis,
} from "./site-note-analysis-state";
import { SiteNoteReview } from "./site-note-review";

const DxfPreview = lazy(() => import("../cad/dxf-preview"));
const PdfPreview = lazy(() => import("./pdf-preview"));
const ImagePreview = lazy(() => import("./image-preview"));
export function ProjectFiles({
  organizationId,
  projectId,
  canManage,
  onTaskCreated,
  onChanged,
}: {
  organizationId: string;
  projectId: string;
  canManage: boolean;
  onTaskCreated: () => void;
  onChanged?: () => void;
}) {
  const { locale } = useLocale(),
    c = fileCopy[locale];
  const [rows, setRows] = useState<ProjectFile[]>([]),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0),
    [more, setMore] = useState(false);
  const [selected, setSelected] = useState<File | null>(null),
    [requestId, setRequestId] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [percent, setPercent] = useState(0),
    [error, setError] = useState<
      | "invalid"
      | "heic"
      | "error"
      | "single"
      | "quotaAccount"
      | "quotaWorkspace"
      | null
    >(null),
    [notice, setNotice] = useState<"success" | "deleted" | null>(null);
  const [removing, setRemoving] = useState<ProjectFile | null>(null),
    [preview, setPreview] = useState<{ file: ProjectFile; url: string } | null>(
      null,
    ),
    [expired, setExpired] = useState(false);
  const [capture, setCapture] = useState<"photo" | "voice" | null>(null);
  const aiFlag =
    canManage && import.meta.env.VITE_AI_SITE_NOTES_ENABLED === "true";
  const ai = useSiteNoteAnalysis(organizationId, projectId, aiFlag);
  const canAnalyze = aiFlag && ai.available;
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const input = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    setExpired(false);
    // DXF is downloaded into memory; signed URL expiry does not expire the drawing.
    if (!preview || preview.file.mime_type === "application/dxf") return;
    const timer = setTimeout(
      () => setExpired(true),
      (PREVIEW_URL_SECONDS - 5) * 1000,
    );
    return () => clearTimeout(timer);
  }, [preview]);
  const { session } = useAuth(),
    userId = session?.user.id ?? "",
    queryClient = useQueryClient();
  // Account usage spans every company, so refresh all cached storage readings.
  // biome-ignore lint/correctness/useExhaustiveDependencies: upload/deletion completion refreshes Settings usage
  useEffect(() => {
    if (!reload) return;
    onChanged?.();
    void queryClient.invalidateQueries({
      queryKey: ["workspace", userId],
      predicate: (query) => query.queryKey[3] === "storage",
    });
  }, [reload]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload refreshes metadata after upload or deletion
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void listFiles(organizationId, projectId)
      .then((data) => {
        if (active) {
          setRows(data);
          setMore(data.length === 20);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizationId, projectId, reload]);
  const [search] = useSearchParams();
  const focusId = search.get("tab") === "documents" ? search.get("file") : null;
  const [focused, setFocused] = useState<ProjectFile | null>(null),
    [focusFailed, setFocusFailed] = useState(false);
  useEffect(() => {
    setFocused(null);
    setFocusFailed(false);
    if (!focusId || loading || rows.some((row) => row.id === focusId)) return;
    let active = true;
    void getProjectFile(organizationId, projectId, focusId)
      .then((file) => {
        if (active) {
          setFocused(file);
          setFocusFailed(!file);
        }
      })
      .catch(() => {
        if (active) setFocusFailed(true);
      });
    return () => {
      active = false;
    };
  }, [focusId, loading, rows, organizationId, projectId]);
  useProjectItemFocus(
    focusId,
    !loading && (!!focused || rows.some((row) => row.id === focusId)),
    "file",
  );
  const visibleRows =
    focused && !rows.some((row) => row.id === focused.id)
      ? [focused, ...rows]
      : rows;
  function selectFile(file: File | null) {
    setNotice(null);
    setRequestId(crypto.randomUUID());
    setPercent(0);
    const problem = file ? validateFile(file) : null;
    setError(problem);
    setSelected(problem ? null : file);
  }
  async function upload() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setPercent(0);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const file = await reserveFile(
        organizationId,
        projectId,
        requestId,
        selected,
      );
      // Recover an upload whose successful response was lost before sending bytes again.
      try {
        await confirmUpload(file);
      } catch {
        await uploadFile(file, selected, setPercent, abort.signal);
      }
      setPercent(100);
      setSelected(null);
      setRequestId(crypto.randomUUID());
      if (input.current) input.current.value = "";
      setNotice("success");
    } catch (error) {
      const code = quotaErrorCode(error);
      setError(
        code === "PZ101"
          ? "quotaAccount"
          : code === "PZ102"
            ? "quotaWorkspace"
            : "error",
      );
    } finally {
      setBusy(false);
      setReload((n) => n + 1);
    }
  }
  async function action(run: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await run();
    } catch {
      setError("error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="project-files" className="saved-projects project-files">
      <header className="document-section-heading">
        <div>
          <h2>{c.title}</h2>
          <p className="helper-text">{c.description}</p>
        </div>
        {canManage && (
          <Button disabled={busy} onClick={() => input.current?.click()}>
            <Upload size={16} aria-hidden="true" />
            {c.add}
          </Button>
        )}
      </header>
      {canManage && (
        <fieldset
          aria-label={c.choose}
          className={`document-upload-shell${dragging ? " is-dragging" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!busy && event.dataTransfer.types.includes("Files")) {
              dragDepth.current += 1;
              setDragging(true);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = busy ? "none" : "copy";
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (!dragDepth.current) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            if (busy) return;
            const files = event.dataTransfer.files;
            if (!files.length) return;
            if (input.current) input.current.value = "";
            if (files.length !== 1) {
              selectFile(null);
              setError("single");
              return;
            }
            selectFile(files[0]);
          }}
        >
          <div className="document-upload">
            <div className="document-drop-target">
              <p>
                {dragging
                  ? c.drop
                  : locale === "fr"
                    ? "Déposez un fichier ici"
                    : "Drop a file here"}
              </p>
              <p className="helper-text" id="project-file-hint">
                {c.hint}
              </p>
              <input
                ref={input}
                id="project-file-input"
                hidden
                aria-label={c.choose}
                aria-describedby="project-file-hint"
                tabIndex={-1}
                type="file"
                accept=".dxf,.pdf,.jpg,.jpeg,.png,.webp,.txt,.docx,.xlsx,.webm,.m4a,.ogg"
                disabled={busy}
                onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="capture-actions">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setCapture("photo")}
              >
                <Camera size={18} aria-hidden="true" />
                {c.photo}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setCapture("voice")}
              >
                <Mic size={18} aria-hidden="true" />
                {c.voice}
              </Button>
            </div>
            {selected && (
              <div className="document-upload-selection">
                <p className="document-selected" role="status">
                  {selected.name}
                </p>
                <Button disabled={busy} onClick={upload}>
                  {busy ? c.loading : c.upload}
                </Button>
              </div>
            )}
          </div>
        </fieldset>
      )}
      {capture && (
        <MediaCapture
          kind={capture}
          close={() => setCapture(null)}
          select={(file) => {
            if (input.current) input.current.value = "";
            selectFile(file);
          }}
        />
      )}
      {selected && busy && (
        <div>
          <progress aria-label={c.progress} max={100} value={percent} />
          <span>{percent}%</span>
        </div>
      )}
      {notice && <p role="status">{c[notice]}</p>}
      {aiFlag && <SiteNoteAnalysisNotices state={ai} />}
      {error && (
        <p role="alert" className="error-message">
          {c[error]}
        </p>
      )}
      {loading && <p role="status">{c.loading}</p>}
      {failed ? (
        <>
          <p role="alert">{c.loadError}</p>
          <Button onClick={() => setReload((n) => n + 1)}>{c.retry}</Button>
        </>
      ) : !loading && !rows.length && !focused ? (
        <p className="document-empty">{c.empty}</p>
      ) : null}
      {focusFailed && (
        <p role="alert">
          {projectDetailCopy[locale].missingItem}{" "}
          <Button variant="ghost" onClick={() => setReload((n) => n + 1)}>
            {c.retry}
          </Button>
        </p>
      )}
      {visibleRows.length > 0 && (
        <>
          {canAnalyze && <p className="helper-text">{c.aiDisclosure}</p>}
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
              {visibleRows.map((file) => (
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
                        <strong>{file.original_name}</strong>
                        {file.state !== "ready" && (
                          <p>
                            {file.state === "pending" ? c.pending : c.deleting}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="document-file-type">
                    {file.original_name
                      .split(".")
                      .pop()
                      ?.slice(0, 5)
                      .toUpperCase() || "FILE"}
                  </td>
                  <td className="document-file-size">
                    {new Intl.NumberFormat(locale, {
                      maximumFractionDigits: 1,
                    }).format(file.size_bytes / 1024)}{" "}
                    KiB
                  </td>
                  <td>
                    <div className="file-actions">
                      {file.state === "ready" ? (
                        <>
                          {canPreview(file.mime_type) && (
                            <Button
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                action(async () => {
                                  const url = await previewUrl(file);
                                  setPreview({ file, url });
                                })
                              }
                            >
                              {file.mime_type === "application/dxf"
                                ? c.openPlan
                                : c.preview}
                            </Button>
                          )}
                          {canAnalyze &&
                            ["audio/webm", "audio/mp4"].includes(
                              file.mime_type,
                            ) && (
                              <Button
                                variant="outline"
                                disabled={busy || !!ai.running}
                                onClick={() => void ai.analyze(file.id)}
                              >
                                <Sparkles size={16} aria-hidden="true" />
                                {c.analyze}
                              </Button>
                            )}
                        </>
                      ) : canManage && file.state === "pending" ? (
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            action(async () => {
                              await confirmUpload(file);
                              setReload((n) => n + 1);
                              setNotice("success");
                            })
                          }
                        >
                          {c.verify}
                        </Button>
                      ) : null}
                      {(file.state === "ready" || canManage) && (
                        <FileMoreActions name={file.original_name}>
                          {file.state === "ready" && (
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() => action(() => downloadFile(file))}
                            >
                              {c.download}
                            </Button>
                          )}
                          {canManage && (
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() => setRemoving(file)}
                            >
                              {c.remove}
                            </Button>
                          )}
                        </FileMoreActions>
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
        {focused && !rows.some((row) => row.id === focused.id)
          ? ` + 1 (${projectDetailCopy[locale].selected})`
          : ""}
      </p>
      {more && !failed && (
        <Button
          disabled={busy || loading}
          variant="outline"
          onClick={() =>
            action(async () => {
              const data = await listFiles(
                organizationId,
                projectId,
                rows.length,
              );
              setRows((old) => [
                ...old,
                ...data.filter((f) => !old.some((o) => o.id === f.id)),
              ]);
              setMore(data.length === 20);
            })
          }
        >
          {c.more}
        </Button>
      )}
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !busy) setRemoving(null);
        }}
      >
        <DialogContent
          title={c.deleteTitle}
          description={c.deleteHint}
          closeLabel={c.close}
        >
          <p>{removing?.original_name}</p>
          <div className="dialog-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              {c.cancel}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                action(async () => {
                  if (!removing) return;
                  await deleteFile(removing);
                  setRemoving(null);
                  setReload((n) => n + 1);
                  setNotice("deleted");
                })
              }
            >
              {c.remove}
            </Button>
          </div>
          {error && <p role="alert">{c[error]}</p>}
        </DialogContent>
      </Dialog>
      {ai.review && (
        <SiteNoteReview
          key={ai.review.key}
          analysis={ai.review.analysis}
          organizationId={organizationId}
          projectId={projectId}
          close={ai.closeReview}
          onTaskCreated={onTaskCreated}
        />
      )}
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent
          className={
            preview?.file.mime_type === "application/dxf"
              ? "dxf-dialog"
              : preview?.file.mime_type === "application/pdf"
                ? "pdf-dialog file-viewer-dialog"
                : preview?.file.mime_type.startsWith("image/")
                  ? "image-dialog file-viewer-dialog"
                  : ""
          }
          title={preview?.file.original_name ?? c.preview}
          description={
            preview?.file.mime_type === "application/dxf"
              ? locale === "fr"
                ? "Plan DXF en lecture seule"
                : "Read-only DXF plan"
              : c.previewHint
          }
          closeLabel={c.close}
        >
          {expired ? (
            <p role="status">{c.expired}</p>
          ) : preview?.file.mime_type === "application/dxf" ? (
            <Suspense fallback={<p role="status">{c.loading}</p>}>
              <DxfPreview key={preview.url} url={preview.url} />
            </Suspense>
          ) : preview?.file.mime_type === "application/pdf" ? (
            <Suspense fallback={<p role="status">{c.loading}</p>}>
              <PdfPreview
                key={preview.url}
                onDownload={() => action(() => downloadFile(preview.file))}
                downloading={busy}
                downloadError={error === "error"}
                url={preview.url}
                title={preview.file.original_name}
              />
            </Suspense>
          ) : preview?.file.mime_type.startsWith("audio/") ? (
            // biome-ignore lint/a11y/useMediaCaption: uploaded voice notes do not include transcripts
            <audio
              controls
              src={preview.url}
              aria-label={preview.file.original_name}
              onError={() => setExpired(true)}
            />
          ) : preview?.file.mime_type.startsWith("image/") ? (
            <Suspense fallback={<p role="status">{c.loading}</p>}>
              <ImagePreview
                key={preview.url}
                url={preview.url}
                title={preview.file.original_name}
                onDownload={() => action(() => downloadFile(preview.file))}
                downloading={busy}
                downloadError={error === "error"}
                onError={() => setExpired(true)}
              />
            </Suspense>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
