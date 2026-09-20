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
    [error, setError] = useState<"invalid" | "heic" | "error" | null>(null),
    [notice, setNotice] = useState<"success" | "deleted" | null>(null);
  const [removing, setRemoving] = useState<ProjectFile | null>(null),
    [preview, setPreview] = useState<{ file: ProjectFile; url: string } | null>(
      null,
    ),
    [expired, setExpired] = useState(false);
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
      <h2>{c.title}</h2>
      <p className="helper-text">{c.hint}</p>
      {canManage && (
        <>
          <label className="field" htmlFor="project-file-input">
            {c.choose}
            <input
              ref={input}
              id="project-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.docx,.xlsx"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setNotice(null);
                setRequestId(crypto.randomUUID());
                setPercent(0);
                const problem = file ? validateFile(file) : null;
                setError(problem);
                setSelected(problem ? null : file);
              }}
            />
          </label>
          <Button disabled={!selected || busy} onClick={upload}>
            {busy ? c.loading : c.upload}
          </Button>
        </>
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
        <p>{c.empty}</p>
      ) : null}
      <ul className="saved-project-list">
        {rows.map((file) => (
          <li key={file.id}>
            <div>
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
