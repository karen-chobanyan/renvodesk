import { exportToBlob } from "@excalidraw/excalidraw";
import type { NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { MAX_PREVIEW_BYTES, type Scene } from "./sketch-model";
export async function previewBlob(scene: Scene) {
  if (!scene.elements.length) {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = scene.appState.viewBackgroundColor;
      ctx.fillRect(0, 0, 320, 200);
    }
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("preview"))),
        "image/png",
      ),
    );
  }
  const blob = await exportToBlob({
    elements: scene.elements as NonDeletedExcalidrawElement[],
    files: scene.files,
    appState: {
      ...scene.appState,
      exportBackground: true,
      exportWithDarkMode: false,
    },
    maxWidthOrHeight: 640,
    mimeType: "image/png",
  });
  if (blob.size > MAX_PREVIEW_BYTES) throw new Error("preview-too-large");
  return blob;
}

export type SaveAttempt = {
  id: string;
  title: string;
  base: number;
  scene: Blob;
  preview: Blob;
  sceneHash: string;
  previewHash: string;
  signature: string;
};
export async function prepareSave(
  scene: Scene,
  title: string,
  base: number,
): Promise<SaveAttempt> {
  const { hashBlob } = await import("./sketch-model");
  const serialized = JSON.stringify(scene),
    body = new Blob([serialized], { type: "application/json" }),
    preview = await previewBlob(scene);
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    base,
    scene: body,
    preview,
    sceneHash: await hashBlob(body),
    previewHash: await hashBlob(preview),
    signature: JSON.stringify([title, serialized]),
  };
}
