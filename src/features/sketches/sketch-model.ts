import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
export const MAX_SCENE_BYTES = 8 * 1024 * 1024;
export const MAX_PREVIEW_BYTES = 1024 * 1024;
export type Scene = {
  type: "excalidraw";
  version: 2;
  source: "renvodesk";
  elements: ExcalidrawElement[];
  appState: { viewBackgroundColor: string };
  files: BinaryFiles;
};
const types = new Set([
  "rectangle",
  "diamond",
  "ellipse",
  "line",
  "arrow",
  "freedraw",
  "text",
  "image",
  "frame",
]);
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function normalizeScene(value: unknown): Scene {
  if (
    !record(value) ||
    value.type !== "excalidraw" ||
    value.version !== 2 ||
    !Array.isArray(value.elements) ||
    value.elements.length > 2000 ||
    !record(value.files)
  )
    throw new Error("invalid-scene");
  const files: BinaryFiles = {};
  const ids = new Set<string>();
  const elements = value.elements
    .filter((e) => !record(e) || !e.isDeleted)
    .map((e) => {
      if (
        !record(e) ||
        typeof e.id !== "string" ||
        !e.id ||
        e.id.length > 128 ||
        ids.has(e.id) ||
        !types.has(String(e.type))
      )
        throw new Error("invalid-scene");
      ids.add(e.id);
      for (const key of ["x", "y", "width", "height"]) {
        if (
          typeof e[key] !== "number" ||
          !Number.isFinite(e[key]) ||
          Math.abs(e[key] as number) > 1000000
        )
          throw new Error("invalid-scene");
      }
      if (e.type === "image") {
        if (typeof e.fileId !== "string" || !record(value.files))
          throw new Error("invalid-image");
        const f = value.files[e.fileId];
        if (
          !record(f) ||
          f.id !== e.fileId ||
          !["image/png", "image/jpeg", "image/webp"].includes(
            String(f.mimeType),
          ) ||
          typeof f.dataURL !== "string" ||
          !f.dataURL.startsWith(`data:${f.mimeType};base64,`) ||
          !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
            f.dataURL,
          )
        )
          throw new Error("invalid-image");
        files[e.fileId] = f as unknown as BinaryFiles[string];
      }
      return { ...e, link: null } as unknown as ExcalidrawElement;
    });
  const color =
    record(value.appState) &&
    typeof value.appState.viewBackgroundColor === "string" &&
    /^#[a-f0-9]{3,8}$/i.test(value.appState.viewBackgroundColor)
      ? value.appState.viewBackgroundColor
      : "#ffffff";
  const scene: Scene = {
    type: "excalidraw",
    version: 2,
    source: "renvodesk",
    elements,
    appState: { viewBackgroundColor: color },
    files,
  };
  if (new TextEncoder().encode(JSON.stringify(scene)).length > MAX_SCENE_BYTES)
    throw new Error("scene-too-large");
  return scene;
}
export function emptyScene(): Scene {
  return {
    type: "excalidraw",
    version: 2,
    source: "renvodesk",
    elements: [],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  };
}
export async function hashBlob(blob: Blob) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export function downloadScene(scene: Scene, title: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(scene)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 80) || "sketch"}.excalidraw`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
