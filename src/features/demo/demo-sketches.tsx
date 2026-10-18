import { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { sketchCopy } from "@/features/sketches/sketch-copy";
import "@/features/sketches/sketch-modal.css";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { type DemoSketch, type SketchScene, say } from "./demo-types";

const Canvas = lazy(() => import("./demo-sketch-canvas"));

const thumbnails: Record<SketchScene, string> = {
  kitchen:
    "M8 8h104v68H8zM8 8h104v11H8zM99 19h13v18H99zM40 40h40v16H40zM48 6h22v4H48z",
  bathroom:
    "M14 8h92v66H14zM14 8h35v66H14zM18 70h27M66 8h40v13H66zM86 56h20v18H86z",
  facade: "M12 8h96v66H12zM24 30h22v30H24zM62 34h34v26H62zM58 30h42",
};

/** Static line drawing standing in for the generated PNG preview. */
export function SketchThumbnail({ scene }: { scene: SketchScene }) {
  return (
    <svg
      className="sketch-preview"
      viewBox="0 0 120 82"
      fill="none"
      stroke="#3d4a46"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d={thumbnails[scene]} />
    </svg>
  );
}

export function DemoSketchDialog({
  sketch,
  close,
}: {
  sketch: DemoSketch;
  close: () => void;
}) {
  const { locale } = useLocale(),
    c = sketchCopy[locale],
    d = useDemoCopy();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        className="sketch-dialog"
        title={say(sketch.title, locale)}
        description={d.sketchDemo}
        closeLabel={locale === "fr" ? "Fermer" : "Close"}
      >
        <div className="sketch-viewer">
          <div className="sketch-viewer-stage">
            <header className="sketch-toolbar">
              <strong>{say(sketch.title, locale)}</strong>
              <div className="task-actions">
                <span role="status">
                  {c.revision} {sketch.revision} · {d.sketchDemo}
                </span>
              </div>
            </header>
            <Suspense fallback={<p role="status">{c.loading}</p>}>
              <Canvas key={locale} scene={sketch.scene} locale={locale} />
            </Suspense>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DemoSketches({
  projectId,
  open,
}: {
  projectId: string;
  open: (sketch: DemoSketch) => void;
}) {
  const { locale } = useLocale(),
    c = sketchCopy[locale],
    d = useDemoCopy();
  const { sketches } = useDemo();
  const rows = sketches.filter((s) => s.projectId === projectId);
  const [notice, setNotice] = useState(false);
  const [search] = useSearchParams();
  const wantsNew =
    search.get("tab") === "documents" && search.get("new") === "sketch";
  useEffect(() => {
    if (wantsNew) setNotice(true);
  }, [wantsNew]);
  return (
    <section id="project-sketches" className="company-form">
      <header className="document-section-heading">
        <div>
          <h2>{c.title}</h2>
          <p className="helper-text">{c.hint}</p>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => setNotice(true)}
        >
          {c.new}
        </button>
      </header>
      {notice && <p role="status">{d.sketchNew}</p>}
      {!rows.length && <p className="document-empty">{c.empty}</p>}
      <div className="document-sketch-gallery">
        {rows.map((sk) => (
          <button
            className="sketch-list-row"
            key={sk.id}
            type="button"
            onClick={() => open(sk)}
          >
            <div className="document-sketch-canvas">
              <SketchThumbnail scene={sk.scene} />
            </div>
            <span>
              <strong>{say(sk.title, locale)}</strong>
              <small>
                {c.revision} {sk.revision}
              </small>
            </span>
            <span className="document-sketch-open">
              {c.open}
              <span aria-hidden="true">↗</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
