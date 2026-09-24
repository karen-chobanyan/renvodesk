import { createRoot } from "react-dom/client";
import { SketchEditor } from "../../src/features/sketches/sketch-editor";
import { emptyScene } from "../../src/features/sketches/sketch-model";
import "../../src/styles.css";

const state = {
  saves: [] as { id: string; base: number; scene: string }[],
  fail: false,
  quota: false,
  conflict: false,
};
Object.assign(window, { sketchHarness: state });
const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <div className="sketch-workspace">
      <SketchEditor
        initial={emptyScene()}
        title="Site sketch"
        revision={0}
        readOnly={false}
        locale="en"
        back="/projects"
        persist={async (attempt) => {
          if (state.quota) throw { code: "PZ101" };
          if (state.conflict) throw { code: "40001" };
          if (state.fail) {
            state.fail = false;
            throw new Error("network");
          }
          state.saves.push({
            id: attempt.id,
            base: attempt.base,
            scene: await attempt.scene.text(),
          });
          return attempt.base + 1;
        }}
        cancelPending={async () => {}}
        onSaved={() => {}}
        reload={() => window.location.reload()}
      />
    </div>,
  );
