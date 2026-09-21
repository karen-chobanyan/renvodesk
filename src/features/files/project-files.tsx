import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n";
import { fileCopy } from "./file-copy";
import { canPreview, validateFile } from "./file-model";
import {
  confirmUpload,
  deleteFile,
  downloadFile,
  listFiles,
  type ProjectFile,
  previewUrl,
  reserveFile,
  uploadFile,
} from "./file-service";

import { MediaCapture } from "./media-capture";

const PdfPreview = lazy(() => import("./pdf-preview"));
export function ProjectFiles({
  organizationId,
  projectId,
  canManage,
}: {
  organizationId: string;
  projectId: string;
  canManage: boolean;
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
      "invalid" | "heic" | "error" | "single" | null
    >(null),
    [notice, setNotice] = useState<"success" | "deleted" | null>(null);
  const [removing, setRemoving] = useState<ProjectFile | null>(null),
    [preview, setPreview] = useState<{ file: ProjectFile; url: string } | null>(
      null,
    ),
    [expired, setExpired] = useState(false);
  const [capture, setCapture] = useState<"photo" | "voice" | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const input = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    setExpired(false);
    if (!preview) return;
    const timer = setTimeout(() => setExpired(true), 55000);
    return () => clearTimeout(timer);
  }, [preview]);
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
    } catch {
      setError("error");
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
        <span className="document-eyebrow">
          {locale === "fr" ? "Bibliothèque" : "Library"}
        </span>
        <h2>{c.title}</h2>
        <p className="helper-text">
          {locale === "fr"
            ? "Plans, photos et pièces utiles au chantier."
            : "Plans, photos and essentials for your site."}
        </p>
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
            <div className="capture-actions">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setCapture("photo")}
              >
                {locale === "fr" ? "Prendre une photo" : "Take a photo"}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setCapture("voice")}
              >
                {locale === "fr" ? "Note vocale" : "Voice note"}
              </Button>
            </div>
            <p className="document-drop-hint">{dragging ? c.drop : c.drag}</p>
            <label className="field" htmlFor="project-file-input">
              {c.choose}
              <input
                ref={input}
                id="project-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.docx,.xlsx,.webm,.m4a,.ogg"
                disabled={busy}
                onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="helper-text">{c.hint}</p>
            {selected && (
              <p className="document-selected" role="status">
                {selected.name}
              </p>
            )}
            <Button disabled={!selected || busy} onClick={upload}>
              {busy ? c.loading : c.upload}
            </Button>
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
      ) : !loading && !rows.length ? (
        <p className="document-empty">{c.empty}</p>
      ) : null}
      <ul className="saved-project-list document-file-list">
        {rows.map((file) => (
          <li key={file.id}>
            <div className="document-file-row">
              <span className="document-file-type" aria-hidden="true">
                {file.original_name
                  .split(".")
                  .pop()
                  ?.slice(0, 5)
                  .toUpperCase() || "FILE"}
              </span>
              <div className="document-file-info">
                <strong>{file.original_name}</strong>
                <p>
                  {new Intl.NumberFormat(locale, {
                    maximumFractionDigits: 1,
                  }).format(file.size_bytes / 1024)}{" "}
                  KiB
                  {file.state !== "ready"
                    ? ` · ${file.state === "pending" ? c.pending : c.deleting}`
                    : ""}
                </p>
              </div>
              <div className="file-actions">
                {file.state === "ready" ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => action(() => downloadFile(file))}
                    >
                      {c.download}
                    </Button>
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
                        {c.preview}
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
                {canManage && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setRemoving(file)}
                  >
                    {c.remove}
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
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
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent
          title={preview?.file.original_name ?? c.preview}
          description={c.previewHint}
          closeLabel={c.close}
        >
          {expired ? (
            <p role="status">{c.expired}</p>
          ) : preview?.file.mime_type === "application/pdf" ? (
            <Suspense fallback={<p role="status">{c.loading}</p>}>
              <PdfPreview
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
          ) : preview ? (
            <img
              className="file-preview"
              alt={preview.file.original_name}
              src={preview.url}
              onError={() => setExpired(true)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
