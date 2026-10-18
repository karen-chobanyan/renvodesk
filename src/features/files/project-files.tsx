import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { projectDetailCopy } from "@/features/projects/project-detail-copy";
import { useProjectItemFocus } from "@/features/projects/use-project-item-focus";
import { quotaErrorCode } from "@/features/storage-usage/storage-model";
import { useLocale } from "@/lib/i18n";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { fileCopy } from "./file-copy";
import { FileLibrary } from "./file-library";
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
import { FileUploader } from "./file-uploader";

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
  active = true,
  onTaskCreated,
  onChanged,
}: {
  organizationId: string;
  projectId: string;
  canManage: boolean;
  active?: boolean;
  onTaskCreated: () => void;
  onChanged?: () => void;
}) {
  const { locale } = useLocale(),
    c = fileCopy[locale];
  const [selected, setSelected] = useState<File | null>(null),
    [requestId, setRequestId] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [uploadBusy, setUploadBusy] = useState(false),
    [actionError, setActionError] = useState<string | null>(null),
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
  const [analyzeFile, setAnalyzeFile] = useState<ProjectFile | null>(null);
  const libraryHeading = useRef<HTMLHeadingElement>(null);
  const modalOpener = useRef<Element | null>(null);
  function rememberFocus() {
    const element = document.activeElement;
    modalOpener.current =
      element?.closest("details")?.querySelector("summary") ?? element;
  }
  function restoreFocus(event: Event) {
    const element = modalOpener.current;
    if (
      element instanceof HTMLElement &&
      element.isConnected &&
      element.getClientRects().length
    ) {
      event.preventDefault();
      element.focus();
    } else if (libraryHeading.current) {
      event.preventDefault();
      libraryHeading.current.focus();
    }
  }
  const [capture, setCapture] = useState<"photo" | "voice" | null>(null);
  const aiFlag =
    canManage && import.meta.env.VITE_AI_SITE_NOTES_ENABLED === "true";
  const ai = useSiteNoteAnalysis(organizationId, projectId, aiFlag);
  const canAnalyze = aiFlag && ai.available;
  const controller = useRef<AbortController | null>(null);
  const activeRef = useRef(active);
  useUnsavedChangesGuard(!!selected || uploadBusy, c.discard);
  useEffect(() => {
    activeRef.current = active;
    if (!active) {
      controller.current?.abort();
      setSelected(null);
      setCapture(null);
      setPreview(null);
      setRemoving(null);
      setAnalyzeFile(null);
    }
    return () => {
      activeRef.current = false;
    };
  }, [active]);
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
  const filesQuery = useInfiniteQuery({
    queryKey: ["workspace", userId, organizationId, "project-files", projectId],
    queryFn: ({ pageParam }) => listFiles(organizationId, projectId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.length === 20 ? pages.length * 20 : undefined,
    enabled: active,
    staleTime: 0,
    retry: false,
  });
  const rows = useMemo(
    () =>
      Array.from(
        new Map(
          (filesQuery.data?.pages.flat() ?? []).map((row) => [row.id, row]),
        ).values(),
      ),
    [filesQuery.data],
  );
  const loading = filesQuery.isPending,
    failed = filesQuery.isError && !filesQuery.isFetchNextPageError;
  const refetch = filesQuery.refetch;
  useEffect(() => {
    const focus = () => {
      if (active) void refetch({ cancelRefetch: false });
    };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [active, refetch]);
  function refresh() {
    void refetch();
    onChanged?.();
    void queryClient.invalidateQueries({
      queryKey: ["workspace", userId],
      predicate: (query) => query.queryKey[3] === "storage",
    });
  }
  const [search] = useSearchParams();
  const focusId = search.get("tab") === "documents" ? search.get("file") : null;
  const [focusRetry, setFocusRetry] = useState(0);
  const [focused, setFocused] = useState<ProjectFile | null>(null),
    [focusFailed, setFocusFailed] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit retry rereads the selected file even when cached pages are unchanged
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
  }, [focusId, loading, rows, organizationId, projectId, focusRetry]);
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
    if (busy) return;
    const problem = file ? validateFile(file) : null;
    if (problem) {
      setError(problem);
      return;
    }
    if (selected && !window.confirm(c.discard)) return;
    setNotice(null);
    setRequestId(crypto.randomUUID());
    setPercent(0);
    setError(null);
    setSelected(file);
  }
  function openCapture(kind: "photo" | "voice") {
    if (selected && !window.confirm(c.discard)) return;
    setSelected(null);
    setError(null);
    setNotice(null);
    rememberFocus();
    setCapture(kind);
  }
  async function upload() {
    if (!selected || busy) return;
    setBusy(true);
    setUploadBusy(true);
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
      setUploadBusy(false);
      refresh();
    }
  }
  async function action(run: () => Promise<void>, fileId: string) {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await run();
    } catch {
      setActionError(fileId);
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
      </header>
      {canManage && (
        <FileUploader
          selected={selected}
          busy={busy}
          uploading={uploadBusy}
          percent={percent}
          select={selectFile}
          capture={openCapture}
          upload={upload}
          error={
            error && (
              <p role="alert" className="error-message">
                {c[error]}
              </p>
            )
          }
          notice={notice && <p role="status">{c[notice]}</p>}
        />
      )}
      {capture && (
        <MediaCapture
          kind={capture}
          close={() => setCapture(null)}
          select={selectFile}
        />
      )}
      <div className="document-library-heading">
        <h3 ref={libraryHeading} tabIndex={-1}>
          {c.library}
        </h3>
        <p className="register-scope">
          {projectDetailCopy[locale].loadedFiles}: {rows.length}
          {focused && !rows.some((row) => row.id === focused.id)
            ? ` + 1 (${projectDetailCopy[locale].selected})`
            : ""}
        </p>
      </div>
      {aiFlag &&
        (ai.running ||
          ai.error ||
          visibleRows.some(
            (file) =>
              file.state === "ready" &&
              ["audio/webm", "audio/mp4"].includes(file.mime_type),
          )) && <SiteNoteAnalysisNotices state={ai} />}
      {loading && <p role="status">{c.loading}</p>}
      {failed ? (
        <>
          <p role="alert">{c.loadError}</p>
          <Button
            disabled={filesQuery.isFetching}
            onClick={() => void refetch()}
          >
            {c.retry}
          </Button>
        </>
      ) : !loading && !rows.length && !focused ? (
        <div className="document-empty">
          <strong>{c.empty}</strong>
          <p className="helper-text">
            {canManage ? c.emptyHint : c.memberEmpty}
          </p>
        </div>
      ) : null}
      {focusFailed && (
        <p role="alert">
          {projectDetailCopy[locale].missingItem}{" "}
          <Button
            variant="ghost"
            disabled={filesQuery.isFetching}
            onClick={() => setFocusRetry((n) => n + 1)}
          >
            {c.retry}
          </Button>
        </p>
      )}
      {visibleRows.length > 0 && (
        <FileLibrary
          focusId={focusId}
          rows={visibleRows.map((file) => ({
            id: file.id,
            name: file.original_name,
            size: file.size_bytes,
            status:
              file.state === "ready"
                ? undefined
                : file.state === "pending"
                  ? c.pending
                  : c.deleting,
            error:
              actionError === file.id ? (
                <p role="alert" className="error-message">
                  {c.actionError}
                </p>
              ) : undefined,
          }))}
          actions={(id) => {
            const file = visibleRows.find((row) => row.id === id);
            if (!file) return null;
            return (
              <>
                {file.state === "ready" ? (
                  <>
                    {canPreview(file.mime_type) ? (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          rememberFocus();
                          void action(async () => {
                            const url = await previewUrl(file);
                            if (activeRef.current) setPreview({ file, url });
                          }, file.id);
                        }}
                      >
                        {file.mime_type === "application/dxf"
                          ? c.openPlan
                          : c.preview}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          action(() => downloadFile(file), file.id)
                        }
                      >
                        {c.download}
                      </Button>
                    )}
                    {canAnalyze &&
                      ["audio/webm", "audio/mp4"].includes(file.mime_type) && (
                        <Button
                          variant="ghost"
                          disabled={busy || !!ai.running}
                          onClick={() => {
                            rememberFocus();
                            setAnalyzeFile(file);
                          }}
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
                        if (file.id === requestId) {
                          setSelected(null);
                          setRequestId(crypto.randomUUID());
                          setError(null);
                        }
                        refresh();
                        setNotice("success");
                      }, file.id)
                    }
                  >
                    {c.verify}
                  </Button>
                ) : null}
                {(canManage ||
                  (file.state === "ready" && canPreview(file.mime_type))) && (
                  <FileMoreActions name={file.original_name}>
                    {file.state === "ready" && canPreview(file.mime_type) && (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          action(() => downloadFile(file), file.id)
                        }
                      >
                        {c.download}
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          rememberFocus();
                          setActionError(null);
                          setRemoving(file);
                        }}
                      >
                        {c.remove}
                      </Button>
                    )}
                  </FileMoreActions>
                )}
              </>
            );
          }}
        />
      )}
      {filesQuery.isFetchNextPageError && (
        <p role="alert" className="error-message">
          {c.moreError}
        </p>
      )}
      {filesQuery.hasNextPage && (
        <Button
          disabled={filesQuery.isFetching}
          variant="outline"
          onClick={() =>
            void filesQuery.fetchNextPage({ cancelRefetch: false })
          }
        >
          {filesQuery.isFetchingNextPage
            ? c.loading
            : filesQuery.isFetchNextPageError
              ? c.retry
              : c.more}
        </Button>
      )}
      <Dialog
        open={!!analyzeFile}
        onOpenChange={(open) => {
          if (!open) setAnalyzeFile(null);
        }}
      >
        <DialogContent
          title={c.analyzeTitle}
          description={analyzeFile?.original_name ?? ""}
          closeLabel={c.close}
          onCloseAutoFocus={restoreFocus}
        >
          <p className="helper-text">{c.aiDisclosure}</p>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setAnalyzeFile(null)}>
              {c.cancel}
            </Button>
            <Button
              onClick={() => {
                if (analyzeFile) void ai.analyze(analyzeFile.id);
                setAnalyzeFile(null);
              }}
            >
              {c.analyze}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !busy) setRemoving(null);
        }}
      >
        <DialogContent
          onCloseAutoFocus={restoreFocus}
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
                  refresh();
                  setNotice("deleted");
                }, removing?.id ?? "")
              }
            >
              {c.remove}
            </Button>
          </div>
          {actionError === removing?.id && <p role="alert">{c.actionError}</p>}
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
          onCloseAutoFocus={restoreFocus}
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
                onDownload={() =>
                  action(() => downloadFile(preview.file), preview.file.id)
                }
                downloading={busy}
                downloadError={actionError === preview.file.id}
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
                onDownload={() =>
                  action(() => downloadFile(preview.file), preview.file.id)
                }
                downloading={busy}
                downloadError={actionError === preview.file.id}
                onError={() => setExpired(true)}
              />
            </Suspense>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
