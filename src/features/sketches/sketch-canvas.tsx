import { Excalidraw, MainMenu, restoreElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { memo, useMemo } from "react";
import type { Scene } from "./sketch-model";

Object.assign(window, { EXCALIDRAW_ASSET_PATH: "/excalidraw/" });
function SketchCanvas({
  scene,
  readOnly,
  locale,
  onChange,
}: {
  scene: Scene;
  readOnly: boolean;
  locale: "fr" | "en";
  onChange: (value: unknown) => void;
}) {
  const initial = useMemo(
    () => ({
      ...scene,
      elements: restoreElements(scene.elements, null),
      scrollToContent: true,
    }),
    [scene],
  );
  return (
    <div className="sketch-canvas">
      <Excalidraw
        initialData={initial}
        langCode={locale === "fr" ? "fr-FR" : "en"}
        viewModeEnabled={readOnly}
        theme="light"
        validateEmbeddable={false}
        onLinkOpen={(_element, event) => event.preventDefault()}
        onChange={(elements, state, files) =>
          onChange({
            type: "excalidraw",
            version: 2,
            elements,
            appState: { viewBackgroundColor: state.viewBackgroundColor },
            files,
          })
        }
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: false,
            toggleTheme: false,
          },
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}

export default memo(SketchCanvas);
