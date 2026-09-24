import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize,
  Minus,
  Plus,
} from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
export default function PdfPreview({
  url,
  title,
  onDownload,
  downloading,
  downloadError,
}: {
  url: string;
  title: string;
  onDownload: () => void;
  downloading: boolean;
  downloadError: boolean;
}) {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [page, setPage] = useState(1),
    [failed, setFailed] = useState(false),
    [rendering, setRendering] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(800);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setWidth(Math.max(160, element.clientWidth - 48)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
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
        const displayWidth = Math.min(width, 1100) * zoom;
        const cssScale = displayWidth / base.width;
        // Bound raster memory while keeping high-density text sharp.
        const scale = Math.min(
          cssScale * Math.min(devicePixelRatio || 1, 2),
          4096 / base.width,
          4096 / base.height,
          Math.sqrt(8000000 / (base.width * base.height)),
        );
        const viewport = sheet.getViewport({ scale });
        // An offscreen canvas isolates cancelled renders from their replacements.
        const buffer = document.createElement("canvas");
        buffer.width = Math.ceil(viewport.width);
        buffer.height = Math.ceil(viewport.height);
        task = sheet.render({ canvas: buffer, viewport });
        await task.promise;
        if (!active || !canvas.current) return;
        const target = canvas.current;
        target.width = buffer.width;
        target.height = buffer.height;
        target.style.width = `${displayWidth}px`;
        target.style.height = `${base.height * cssScale}px`;
        target.getContext("2d")?.drawImage(buffer, 0, 0);
        setRendering(false);
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
  }, [pdf, page, width, zoom]);
  return (
    <div className="pdf-preview">
      <fieldset
        className="pdf-toolbar"
        aria-label={fr ? "Commandes du PDF" : "PDF controls"}
      >
        <div className="pdf-control-group">
          <Button
            variant="outline"
            size="icon"
            aria-label={fr ? "Précédente" : "Previous"}
            disabled={!pdf || page <= 1 || rendering}
            onClick={() => {
              setPage((p) => p - 1);
              stage.current?.scrollTo(0, 0);
            }}
          >
            <ChevronLeft size={18} />
          </Button>
          <span className="pdf-page-count" aria-live="polite">
            Page {page} / {pdf?.numPages ?? "…"}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label={fr ? "Suivante" : "Next"}
            disabled={!pdf || page >= pdf.numPages || rendering}
            onClick={() => {
              setPage((p) => p + 1);
              stage.current?.scrollTo(0, 0);
            }}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
        <div className="pdf-control-group">
          <Button
            variant="outline"
            size="icon"
            aria-label={fr ? "Réduire" : "Zoom out"}
            disabled={!pdf || zoom <= 0.5}
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          >
            <Minus size={18} />
          </Button>
          <output
            className="pdf-zoom"
            aria-label={
              fr ? "Zoom relatif à la largeur" : "Zoom relative to width"
            }
          >
            {Math.round(zoom * 100)}%
          </output>
          <Button
            variant="outline"
            size="icon"
            aria-label={fr ? "Agrandir" : "Zoom in"}
            disabled={!pdf || zoom >= 2}
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
          >
            <Plus size={18} />
          </Button>
          <Button
            variant="outline"
            disabled={!pdf}
            onClick={() => {
              setZoom(1);
              stage.current?.scrollTo(0, 0);
            }}
          >
            <Maximize size={16} aria-hidden="true" />
            {fr ? "Ajuster la largeur" : "Fit width"}
          </Button>
        </div>
        <Button variant="outline" disabled={downloading} onClick={onDownload}>
          <Download size={16} aria-hidden="true" />
          {fr ? "Télécharger" : "Download"}
        </Button>
      </fieldset>
      {downloadError && (
        <p role="alert" className="pdf-notice">
          {fr
            ? "Le téléchargement a échoué. Réessayez."
            : "Download failed. Try again."}
        </p>
      )}
      <section
        className="pdf-stage"
        ref={stage}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard scrolling of the document viewport
        tabIndex={0}
        aria-label={fr ? "Page du document PDF" : "PDF document page"}
        aria-busy={rendering}
      >
        {failed && (
          <p role="alert" className="pdf-notice">
            {fr
              ? "Aperçu indisponible. Téléchargez le fichier."
              : "Preview unavailable. Download the file."}
          </p>
        )}
        {rendering && (
          <p role="status" className="pdf-notice">
            {fr ? "Chargement…" : "Loading…"}
          </p>
        )}
        <canvas
          ref={canvas}
          role="img"
          aria-label={`${title} - ${page}`}
          data-rendered={!rendering && !failed}
          style={{ visibility: rendering || failed ? "hidden" : "visible" }}
        />
      </section>
    </div>
  );
}
