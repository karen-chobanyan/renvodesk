import { Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "../../styles.css";
import "./prototype.css";
import { Button } from "@/components/ui/button";
import { LocaleProvider, useLocale } from "@/lib/i18n";
import { copy } from "../cad/copy";
import {
  type Layer,
  type ViewerCommand,
  type ViewerEvent,
  validDxfFile,
  validDxfText,
} from "../cad/model";
import sample from "./sample.dxf?raw";

function Prototype() {
  const { locale, setLocale } = useLocale();
  const c = copy[locale];
  const frame = useRef<HTMLIFrameElement>(null);
  const sequence = useRef(0);
  const [drawing, setDrawing] = useState<{
    content: string;
    name: string;
    id: number;
  } | null>(null);
  const [status, setStatus] = useState<
    "empty" | "loading" | "loaded" | "error"
  >("empty");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [count, setCount] = useState(0);
  const send = useCallback((command: ViewerCommand) => {
    frame.current?.contentWindow?.postMessage(command, location.origin);
  }, []);
  useEffect(() => {
    if (!drawing) return;
    const timeout = window.setTimeout(() => {
      setStatus("error");
      setDrawing(null);
    }, 30000);
    const receive = (event: MessageEvent<ViewerEvent>) => {
      if (
        event.origin !== location.origin ||
        event.source !== frame.current?.contentWindow
      )
        return;
      if (event.data.type === "ready")
        send({ type: "open", content: drawing.content });
      if (event.data.type === "loaded") {
        clearTimeout(timeout);
        setLayers(event.data.layers);
        setCount(event.data.entities);
        setStatus("loaded");
      }
      if (event.data.type === "error") {
        clearTimeout(timeout);
        setStatus("error");
        setDrawing(null);
      }
    };
    window.addEventListener("message", receive);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("message", receive);
    };
  }, [drawing, send]);
  function open(content: string, name: string, id: number) {
    if (id !== sequence.current) return;
    if (!validDxfText(content)) {
      setDrawing(null);
      setStatus("error");
      return;
    }
    setLayers([]);
    setStatus("loading");
    setDrawing({ content, name, id });
  }
  return (
    <main className="cad-prototype">
      <header className="cad-heading">
        <div>
          <p className="eyebrow">RenvoDesk / {c.eyebrow}</p>
          <h1>{c.title}</h1>
          <p>{c.intro}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
        >
          {locale === "fr" ? "English" : "Français"}
        </Button>
      </header>
      <div className="cad-actions">
        <Button onClick={() => open(sample, c.sampleName, ++sequence.current)}>
          {c.sample}
        </Button>
        <label className="cad-file">
          {c.file}
          <input
            aria-label={c.file}
            type="file"
            accept=".dxf"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              const id = ++sequence.current;
              if (!validDxfFile(file)) {
                setDrawing(null);
                setStatus("error");
                return;
              }
              setStatus("loading");
              setDrawing(null);
              try {
                open(await file.text(), file.name, id);
              } catch {
                if (id === sequence.current) setStatus("error");
              }
            }}
          />
        </label>
        <small>{c.limit}</small>
      </div>
      <p className="cad-warning">{c.note}</p>
      <div className="cad-actions">
        <Button
          variant="outline"
          disabled={status !== "loaded"}
          size="icon"
          aria-label={c.fit}
          title={c.fit}
          onClick={() => send({ type: "fit" })}
        >
          <Maximize size={18} aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          disabled={status !== "loaded"}
          size="icon"
          aria-label={c.zoomIn}
          title={c.zoomIn}
          onClick={() => send({ type: "zoom", factor: 1.25 })}
        >
          <ZoomIn size={18} aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          disabled={status !== "loaded"}
          size="icon"
          aria-label={c.zoomOut}
          title={c.zoomOut}
          onClick={() => send({ type: "zoom", factor: 0.8 })}
        >
          <ZoomOut size={18} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          disabled={!drawing && status !== "loading"}
          onClick={() => {
            ++sequence.current;
            setDrawing(null);
            setStatus("empty");
            setLayers([]);
          }}
        >
          {c.close}
        </Button>
      </div>
      <p role={status === "error" ? "alert" : "status"}>
        {status === "error"
          ? c.error
          : status === "loading"
            ? c.loading
            : status === "loaded"
              ? `${c.loaded} · ${drawing?.name} · ${count} ${c.entities}`
              : c.empty}
      </p>
      <div className="cad-workspace">
        <div className="cad-stage">
          {drawing && (
            <iframe
              key={drawing.id}
              ref={frame}
              title={c.canvas}
              src="/cad-canvas.html"
            />
          )}
        </div>
        <fieldset className="cad-layers" disabled={status !== "loaded"}>
          <legend>{c.layers}</legend>
          {layers.map((layer) => (
            <label key={layer.name}>
              <input
                type="checkbox"
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
              <span>
                {layer.name}
                {layer.isFrozen ? ` (${c.frozen})` : ""}
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      <p className="muted">{c.gesture}</p>
      <p className="muted">{c.fallback}</p>
    </main>
  );
}
const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <LocaleProvider>
      <Prototype />
    </LocaleProvider>,
  );
