import { type ViewerCommand, type ViewerEvent, validDxfText } from "./model";

const notify = (event: ViewerEvent) =>
  parent.postMessage(event, location.origin);
let opened = false;
async function start(content: string) {
  const [
    { AcApDocManager, AcApSettingManager, AcEdOpenMode, AcEdViewMode },
    { FontManager },
    { AcGeBox2d },
  ] = await Promise.all([
    import("@mlightcad/cad-simple-viewer"),
    import("@mlightcad/mtext-renderer"),
    import("@mlightcad/data-model"),
  ]);
  const container = document.getElementById("canvas");
  if (!container) throw new Error("Missing canvas");
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
  FontManager.instance.setDefaultFonts(["Noto Sans"]);
  FontManager.instance.setSymbolFonts(["Noto Sans"]);
  await manager.loadFonts(["Noto Sans"]);
  const success = await manager.openDocument(
    "local-plan.dxf",
    new TextEncoder().encode(content).buffer,
    { mode: AcEdOpenMode.Read },
  );
  if (!success || !(await manager.curView.waitUntilIdle(20000)))
    throw new Error("Open failed");
  manager.curView.mode = AcEdViewMode.PAN;
  manager.curView.zoomToFitDrawing();
  const entities = manager.curDocument.database.tables.blockTable.modelSpace;
  let count = 0;
  for (const _entity of entities.newIterator()) count++;
  if (!count) throw new Error("No model-space geometry");
  notify({
    type: "loaded",
    layers: manager.curDocument.layerStore
      .getLayers()
      .map(({ name, isOn, isFrozen, cssColor }) => ({
        name,
        isOn,
        isFrozen,
        color: cssColor,
      })),
    entities: count,
  });
  window.addEventListener("message", (event: MessageEvent<ViewerCommand>) => {
    if (event.origin !== location.origin || event.source !== parent) return;
    const command = event.data;
    try {
      if (command.type === "fit") manager.curView.zoomToFitDrawing();
      if (
        command.type === "layer" &&
        typeof command.name === "string" &&
        typeof command.visible === "boolean"
      )
        manager.curDocument.layerStore.setLayerOn(
          command.name,
          command.visible,
        );
      if (command.type === "zoom" && [0.8, 1.25].includes(command.factor)) {
        const view = manager.curView;
        const a = view.screenToWorld({ x: 0, y: container.clientHeight });
        const b = view.screenToWorld({ x: container.clientWidth, y: 0 });
        const cx = (a.x + b.x) / 2,
          cy = (a.y + b.y) / 2;
        const hx = (b.x - a.x) / 2 / command.factor,
          hy = (b.y - a.y) / 2 / command.factor;
        view.zoomTo(
          new AcGeBox2d({ x: cx - hx, y: cy - hy }, { x: cx + hx, y: cy + hy }),
          // The margin is a multiplier: 1 preserves the requested bounds.
          1,
        );
      }
    } catch {
      notify({ type: "error" });
    }
  });
  window.addEventListener(
    "pagehide",
    () => {
      void manager.destroy().catch(() => {});
    },
    { once: true },
  );
}
window.addEventListener("message", (event: MessageEvent<ViewerCommand>) => {
  if (
    event.origin !== location.origin ||
    event.source !== parent ||
    opened ||
    event.data?.type !== "open"
  )
    return;
  opened = true;
  if (
    typeof event.data.content !== "string" ||
    !validDxfText(event.data.content)
  ) {
    notify({ type: "error" });
    return;
  }
  void start(event.data.content).catch(() => notify({ type: "error" }));
});
notify({ type: "ready" });
