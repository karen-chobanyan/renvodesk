import { Download, Maximize, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const STAGE_PADDING = 48;

export default function ImagePreview({
  url,
  title,
  onDownload,
  downloading,
  downloadError,
  onError,
}: {
  url: string;
  title: string;
  onDownload: () => void;
  downloading: boolean;
  downloadError: boolean;
  onError: () => void;
}) {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const stage = useRef<HTMLElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [image, setImage] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setDimensions({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const availableWidth = Math.max(160, dimensions.width - STAGE_PADDING);
  const availableHeight = Math.max(160, dimensions.height - STAGE_PADDING);
  const fit =
    image.width && image.height
      ? Math.min(availableWidth / image.width, availableHeight / image.height)
      : 1;
  const displayWidth = Math.round(image.width * fit * zoom);
  const displayHeight = Math.round(image.height * fit * zoom);
  const ready = image.width > 0 && image.height > 0;

  return (
    <div className="image-preview">
      <div className="image-toolbar">
        <div className="image-control-group">
          <Button
            variant="outline"
            size="icon"
            aria-label={fr ? "Réduire" : "Zoom out"}
            disabled={!ready || zoom <= MIN_ZOOM}
            onClick={() =>
              setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))
            }
          >
            <Minus size={18} aria-hidden="true" />
          </Button>
          <output
            className="image-zoom"
            aria-label={
              fr ? "Zoom relatif à la fenêtre" : "Zoom relative to viewport"
            }
          >
            {Math.round(zoom * 100)}%
          </output>
          <Button
            variant="outline"
            size="icon"
            aria-label={fr ? "Agrandir" : "Zoom in"}
            disabled={!ready || zoom >= MAX_ZOOM}
            onClick={() =>
              setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))
            }
          >
            <Plus size={18} aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            disabled={!ready}
            onClick={() => {
              setZoom(1);
              stage.current?.scrollTo(0, 0);
            }}
          >
            <Maximize size={16} aria-hidden="true" />
            {fr ? "Ajuster à la fenêtre" : "Fit to window"}
          </Button>
        </div>
        <Button variant="outline" disabled={downloading} onClick={onDownload}>
          <Download size={16} aria-hidden="true" />
          {fr ? "Télécharger" : "Download"}
        </Button>
      </div>
      {downloadError && (
        <p role="alert" className="image-notice">
          {fr
            ? "Le téléchargement a échoué. Réessayez."
            : "Download failed. Try again."}
        </p>
      )}
      <section
        className="image-stage"
        ref={stage}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard scrolling of the zoomed image viewport
        tabIndex={0}
        aria-label={fr ? "Image du projet" : "Project image"}
        aria-busy={!ready}
      >
        {!ready && (
          <p role="status" className="image-notice">
            {fr ? "Chargement…" : "Loading…"}
          </p>
        )}
        <div
          className="image-plane"
          style={{
            width: Math.max(availableWidth, displayWidth),
            height: Math.max(availableHeight, displayHeight),
          }}
        >
          <img
            src={url}
            alt={title}
            draggable={false}
            onLoad={(event) =>
              setImage({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            onError={onError}
            style={{
              width: displayWidth || undefined,
              height: displayHeight || undefined,
              visibility: ready ? "visible" : "hidden",
            }}
          />
        </div>
      </section>
    </div>
  );
}
