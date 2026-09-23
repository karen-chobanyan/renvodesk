import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import type { Layer } from "./model";

export type CadCanvasControls = {
  fit: () => void;
  zoom: (factor: 0.8 | 1.25) => void;
  setLayerVisible: (name: string, visible: boolean) => void;
};

type OpenedDrawing = {
  controls: CadCanvasControls;
  destroy: () => Promise<void>;
};

// The CAD library has one document manager per page. Finish each teardown before
// another canvas can create that singleton, including React's effect replay.
let lifecycle: Promise<void> = Promise.resolve();
function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const operation = lifecycle.then(work, work);
  lifecycle = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

async function openDrawing(
  container: HTMLElement,
  content: string,
  active: () => boolean,
  onLoaded: (layers: Layer[], entities: number) => void,
): Promise<OpenedDrawing | null> {
  if (!active()) return null;
  const [
    { AcApDocManager, AcApSettingManager, AcEdOpenMode, AcEdViewMode },
    { FontManager },
    { AcGeBox2d },
  ] = await Promise.all([
    import("@mlightcad/cad-simple-viewer"),
    import("@mlightcad/mtext-renderer"),
    import("@mlightcad/data-model"),
  ]);
  if (!active()) return null;
  for (const key of [
    "isShowCommandLine",
    "isShowShortCutToolbar",
    "isShowToolbar",
    "isShowCoordinate",
  ] as const) {
    AcApSettingManager.instance.set(key, false, { persist: false });
  }
  const manager = AcApDocManager.createInstance({
    container,
    autoResize: true,
    baseUrl: `${location.origin}/`,
    useMainThreadDraw: true,
    builtinOpenFileDialog: false,
    disableExport: true,
    notificationCenter: false,
  });
  if (!manager) throw new Error("Viewer initialization failed");
  let handedOff = false;
  try {
    FontManager.instance.setDefaultFonts(["Noto Sans"]);
    FontManager.instance.setSymbolFonts(["Noto Sans"]);
    await manager.loadFonts(["Noto Sans"]);
    if (!active()) return null;
    const success = await manager.openDocument(
      "local-plan.dxf",
      new TextEncoder().encode(content).buffer,
      { mode: AcEdOpenMode.Read },
    );
    if (!success || !(await manager.curView.waitUntilIdle(20000)))
      throw new Error("Open failed");
    if (!active()) return null;
    manager.curView.mode = AcEdViewMode.PAN;
    manager.curView.zoomToFitDrawing();
    const entities = manager.curDocument.database.tables.blockTable.modelSpace;
    let count = 0;
    for (const _entity of entities.newIterator()) count++;
    if (!count) throw new Error("No model-space geometry");
    const controls: CadCanvasControls = {
      fit: () => manager.curView.zoomToFitDrawing(),
      setLayerVisible: (name, visible) =>
        manager.curDocument.layerStore.setLayerOn(name, visible),
      zoom: (factor) => {
        const view = manager.curView;
        const a = view.screenToWorld({ x: 0, y: container.clientHeight });
        const b = view.screenToWorld({ x: container.clientWidth, y: 0 });
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const hx = (b.x - a.x) / 2 / factor;
        const hy = (b.y - a.y) / 2 / factor;
        view.zoomTo(
          new AcGeBox2d({ x: cx - hx, y: cy - hy }, { x: cx + hx, y: cy + hy }),
          1,
        );
      },
    };
    onLoaded(
      manager.curDocument.layerStore
        .getLayers()
        .map(({ name, isOn, isFrozen, cssColor }) => ({
          name,
          isOn,
          isFrozen,
          color: cssColor,
        })),
      count,
    );
    handedOff = true;
    return { controls, destroy: () => manager.destroy() };
  } finally {
    // Cancellation or failure can happen while fonts or the document load.
    if (!handedOff && AcApDocManager.tryGetInstance() === manager)
      await manager.destroy();
  }
}

export function CadCanvas({
  content,
  label,
  controlsRef,
  onLoaded,
  onError,
}: {
  content: string;
  label: string;
  controlsRef: Ref<CadCanvasControls>;
  onLoaded: (layers: Layer[], entities: number) => void;
  onError: () => void;
}) {
  const container = useRef<HTMLElement>(null);
  const controls = useRef<CadCanvasControls | null>(null);
  const callbacks = useRef({ onLoaded, onError });
  callbacks.current = { onLoaded, onError };
  useImperativeHandle(
    controlsRef,
    () => ({
      fit: () => controls.current?.fit(),
      zoom: (factor) => controls.current?.zoom(factor),
      setLayerVisible: (name, visible) =>
        controls.current?.setLayerVisible(name, visible),
    }),
    [],
  );
  useEffect(() => {
    let active = true;
    const element = container.current;
    if (!element) return;
    const opening = enqueue(() =>
      openDrawing(
        element,
        content,
        () => active,
        (layers, entities) => {
          if (active) callbacks.current.onLoaded(layers, entities);
        },
      ),
    );
    void opening
      .then((opened) => {
        if (active && opened) controls.current = opened.controls;
      })
      .catch(() => {
        if (active) callbacks.current.onError();
      });
    return () => {
      active = false;
      controls.current = null;
      void enqueue(async () => {
        const opened = await opening.catch(() => null);
        await opened?.destroy();
      }).catch(() => {});
    };
  }, [content]);
  return (
    <section
      ref={container}
      className="cad-render-surface"
      aria-label={label}
    />
  );
}
