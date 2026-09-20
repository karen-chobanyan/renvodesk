import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const source = new URL(
  "node_modules/@excalidraw/excalidraw/dist/prod/fonts/",
  root,
);
const target = new URL("public/excalidraw/fonts/", root);
mkdirSync(fileURLToPath(target), { recursive: true });
cpSync(fileURLToPath(source), fileURLToPath(target), { recursive: true });
