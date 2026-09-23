import {
  Info,
  Layers,
  Maximize,
  PanelLeftClose,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { CadCanvas, type CadCanvasControls } from "./cad-canvas";
import { copy } from "./copy";
import {
  type Layer,
  MAX_DXF_BYTES,
  type ViewerCommand,
  validDxfText,
} from "./model";
import "./preview.css";

// Do not pass signed URLs to the renderer or persist fetched drawing data.
async function readDrawing(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    signal,
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok || !response.body) throw new Error("Download failed");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_DXF_BYTES) throw new Error("Drawing too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const content = new TextDecoder().decode(bytes);
  if (!validDxfText(content)) throw new Error("Unsupported drawing");
  return content;
}

export default function DxfPreview({ url }: { url: string }) {
  const { locale } = useLocale();
  const c = copy[locale];
  const controls = useRef<CadCanvasControls>(null);
  const timeout = useRef<number | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const [showLayers, setShowLayers] = useState(
    () => window.matchMedia("(min-width: 701px)").matches,
  );
  const [showInfo, setShowInfo] = useState(false);
  const [layers, setLayers] = useState<Layer[]>([]);
  const send = useCallback((command: ViewerCommand) => {
    try {
      if (command.type === "fit") controls.current?.fit();
      if (command.type === "zoom") controls.current?.zoom(command.factor);
      if (command.type === "layer")
        controls.current?.setLayerVisible(command.name, command.visible);
    } catch {
      setStatus("error");
      setContent(null);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setStatus("loading");
    setContent(null);
    setLayers([]);
    function fail() {
      if (!active) return;
      active = false;
      controller.abort();
      if (timeout.current !== null) clearTimeout(timeout.current);
      setStatus("error");
      setContent(null);
    }
    timeout.current = window.setTimeout(fail, 30000);
    void readDrawing(url, controller.signal)
      .then((text) => {
        if (!active || controller.signal.aborted) return;
        setContent(text);
      })
      .catch(fail);
    return () => {
      active = false;
      controller.abort();
      if (timeout.current !== null) clearTimeout(timeout.current);
    };
  }, [url]);
  return (
    <div className={`dxf-preview${showLayers ? " has-layers" : ""}`}>
      <p
        className={status === "loaded" ? "sr-only" : "dxf-status"}
        role={status === "error" ? "alert" : "status"}
      >
        {status === "error"
          ? c.previewError
          : status === "loading"
            ? c.loading
            : c.loaded}
      </p>
      <div className="dxf-stage">
        {content && (
          <CadCanvas
            content={content}
            label={c.canvas}
            controlsRef={controls}
            onLoaded={(nextLayers) => {
              if (timeout.current !== null) clearTimeout(timeout.current);
              setLayers(nextLayers);
              setStatus("loaded");
            }}
            onError={() => {
              if (timeout.current !== null) clearTimeout(timeout.current);
              setContent(null);
              setStatus("error");
            }}
          />
        )}
      </div>
      {showLayers && (
        <aside className="dxf-layers" id="dxf-layers" aria-label={c.layers}>
          <header>
            <strong>{c.layers}</strong>
            <Button
              variant="ghost"
              size="icon"
              aria-label={c.layers}
              title={c.layers}
              onClick={() => setShowLayers(false)}
            >
              <PanelLeftClose size={16} aria-hidden="true" />
            </Button>
          </header>
          <div className="dxf-layer-columns" aria-hidden="true">
            <span>{c.name}</span>
            <span>{c.visible}</span>
            <span>{c.color}</span>
          </div>
          <fieldset disabled={status !== "loaded"}>
            <legend className="sr-only">{c.layers}</legend>
            {layers.map((layer) => (
              <label className="dxf-layer-row" key={layer.name}>
                <span title={layer.name}>
                  {layer.name}
                  {layer.isFrozen ? ` (${c.frozen})` : ""}
                </span>
                <input
                  type="checkbox"
                  aria-label={layer.name}
                  checked={layer.isOn && !layer.isFrozen}
                  disabled={layer.isFrozen}
                  onChange={(event) => {
                    const visible = event.target.checked;
                    send({ type: "layer", name: layer.name, visible });
                    setLayers((old) =>
                      old.map((item) =>
                        item.name === layer.name
                          ? { ...item, isOn: visible }
                          : item,
                      ),
                    );
                  }}
                />
                <span
                  className="dxf-layer-color"
                  aria-hidden="true"
                  style={{
                    backgroundColor: CSS.supports("color", layer.color)
                      ? layer.color
                      : "#ffffff",
                  }}
                />
              </label>
            ))}
          </fieldset>
        </aside>
      )}
      <fieldset className="dxf-controls" aria-label={c.tools}>
        <Button
          variant="ghost"
          size="icon"
          title={c.fit}
          aria-label={c.fit}
          disabled={status !== "loaded"}
          onClick={() => send({ type: "fit" })}
        >
          <Maximize size={18} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={c.zoomIn}
          aria-label={c.zoomIn}
          disabled={status !== "loaded"}
          onClick={() => send({ type: "zoom", factor: 1.25 })}
        >
          <ZoomIn size={18} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={c.zoomOut}
          aria-label={c.zoomOut}
          disabled={status !== "loaded"}
          onClick={() => send({ type: "zoom", factor: 0.8 })}
        >
          <ZoomOut size={18} aria-hidden="true" />
        </Button>
        <span className="dxf-tool-divider" />
        <Button
          variant="ghost"
          size="icon"
          title={c.layers}
          aria-label={c.layers}
          aria-expanded={showLayers}
          aria-controls="dxf-layers"
          onClick={() => setShowLayers((value) => !value)}
        >
          <Layers size={18} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={c.information}
          aria-label={c.information}
          aria-expanded={showInfo}
          aria-controls="dxf-information"
          onClick={() => setShowInfo((value) => !value)}
        >
          <Info size={18} aria-hidden="true" />
        </Button>
      </fieldset>
      {showInfo && (
        <section
          className="dxf-information"
          id="dxf-information"
          aria-label={c.information}
        >
          <strong>{c.readOnly}</strong>
          <p>{c.gesture}</p>
          <p>{c.note}</p>
          <p>{c.fallback}</p>
        </section>
      )}
    </div>
  );
}
