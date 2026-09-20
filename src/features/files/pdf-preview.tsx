import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
export default function PdfPreview({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [page, setPage] = useState(1),
    [failed, setFailed] = useState(false),
    [rendering, setRendering] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    let destroy: (() => void) | undefined;
    void (async () => {
      try {
        const [lib, worker] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        if (!active) return;
        lib.GlobalWorkerOptions.workerSrc = worker.default;
        const task = lib.getDocument({
          url,
          enableXfa: false,
          maxImageSize: 16000000,
          useSystemFonts: true,
          disableAutoFetch: true,
          disableStream: true,
        });
        destroy = () => {
          void task.destroy();
        };
        const document = await task.promise;
        if (active) setPdf(document);
      } catch {
        if (active) {
          setFailed(true);
          setRendering(false);
        }
      }
    })();
    return () => {
      active = false;
      destroy?.();
    };
  }, [url]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let active = true;
    let task: RenderTask | undefined;
    setRendering(true);
    setFailed(false);
    void (async () => {
      try {
        const sheet = await pdf.getPage(page);
        if (!active || !canvas.current) return;
        const base = sheet.getViewport({ scale: 1 });
        const scale = Math.min(2, 1000 / base.width, 1400 / base.height);
        const viewport = sheet.getViewport({ scale });
        const target = canvas.current;
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        task = sheet.render({ canvas: target, viewport });
        await task.promise;
        if (active) setRendering(false);
      } catch {
        if (active) {
          setFailed(true);
          setRendering(false);
        }
      }
    })();
    return () => {
      active = false;
      task?.cancel();
    };
  }, [pdf, page]);
  return (
    <div className="pdf-preview">
      <div className="file-actions">
        <Button
          variant="outline"
          disabled={!pdf || page <= 1 || rendering}
          onClick={() => setPage((p) => p - 1)}
        >
          {fr ? "Précédente" : "Previous"}
        </Button>
        <span>
          {page} / {pdf?.numPages ?? "…"}
        </span>
        <Button
          variant="outline"
          disabled={!pdf || page >= pdf.numPages || rendering}
          onClick={() => setPage((p) => p + 1)}
        >
          {fr ? "Suivante" : "Next"}
        </Button>
      </div>
      {failed ? (
        <p role="alert">
          {fr
            ? "Aperçu indisponible. Téléchargez le fichier."
            : "Preview unavailable. Download the file."}
        </p>
      ) : (
        <>
          {rendering && <p role="status">{fr ? "Chargement…" : "Loading…"}</p>}
          <canvas
            ref={canvas}
            role="img"
            aria-label={`${title} - ${page}`}
            data-rendered={!rendering}
          />
        </>
      )}
    </div>
  );
}
