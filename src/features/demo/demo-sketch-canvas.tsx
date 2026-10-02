import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import { useMemo } from "react";
import SketchCanvas from "@/features/sketches/sketch-canvas";
import type { Scene } from "@/features/sketches/sketch-model";
import type { Locale } from "@/lib/i18n";
import type { SketchScene } from "./demo-types";

type Labels = Record<string, string>;
/** Excalidraw's system sans family; measured correctly before web fonts load. */
const SANS = 2;
const labels: Record<Locale, Labels> = {
  fr: {
    island: "Îlot 240 × 100",
    worktop: "Plan de travail",
    window: "Fenêtre",
    fridge: "Frigo",
    door: "Porte",
    shower: "Douche à l’italienne",
    vanity: "Meuble vasque",
    wc: "WC suspendu",
    drain: "Siphon linéaire",
    newWindow: "Nouvelle baie 180 cm",
    existing: "Fenêtre existante",
    lintel: "Linteau acier à prévoir",
    note: "Cotes indicatives, à vérifier sur place",
  },
  en: {
    island: "Island 240 × 100",
    worktop: "Worktop",
    window: "Window",
    fridge: "Fridge",
    door: "Door",
    shower: "Walk-in shower",
    vanity: "Vanity unit",
    wc: "Wall-hung WC",
    drain: "Linear drain",
    newWindow: "New 180 cm opening",
    existing: "Existing window",
    lintel: "Steel lintel required",
    note: "Indicative sizes, check on site",
  },
};

const box = (
  x: number,
  y: number,
  width: number,
  height: number,
  text?: string,
  backgroundColor = "transparent",
): ExcalidrawElementSkeleton => ({
  type: "rectangle",
  x,
  y,
  width,
  height,
  backgroundColor,
  fillStyle: "hachure",
  ...(text ? { label: { text, fontSize: 16, fontFamily: SANS } } : {}),
});
const text = (
  x: number,
  y: number,
  value: string,
): ExcalidrawElementSkeleton => ({
  type: "text",
  x,
  y,
  text: value,
  fontSize: 16,
  fontFamily: SANS,
  strokeColor: "#5b6b66",
});

function skeletons(scene: SketchScene, l: Labels): ExcalidrawElementSkeleton[] {
  if (scene === "kitchen")
    return [
      box(0, 0, 640, 420),
      box(0, 0, 640, 70, l.worktop, "#e8e2d4"),
      box(560, 70, 80, 110, l.fridge),
      box(200, 200, 240, 100, l.island, "#dfe8e2"),
      box(250, -12, 140, 24, l.window, "#cfe0ef"),
      { type: "arrow", x: 0, y: 360, width: 0, height: -90 },
      text(12, 330, l.door),
      text(0, 440, l.note),
    ];
  if (scene === "bathroom")
    return [
      box(0, 0, 420, 300),
      box(0, 0, 160, 300, l.shower, "#dfe8e2"),
      {
        type: "line",
        x: 20,
        y: 280,
        width: 120,
        height: 0,
        strokeColor: "#1f6f8b",
      },
      text(20, 250, l.drain),
      box(240, 0, 180, 60, l.vanity, "#e8e2d4"),
      box(330, 220, 90, 80, l.wc),
      text(0, 320, l.note),
    ];
  return [
    box(0, 0, 560, 380),
    box(60, 120, 120, 150, l.existing, "#cfe0ef"),
    box(300, 140, 180, 140, l.newWindow, "#dfe8e2"),
    {
      type: "line",
      x: 280,
      y: 122,
      width: 220,
      height: 0,
      strokeWidth: 4,
      strokeColor: "#b5523b",
    },
    text(290, 92, l.lintel),
    text(0, 400, l.note),
  ];
}

export default function DemoSketchCanvas({
  scene,
  locale,
}: {
  scene: SketchScene;
  locale: Locale;
}) {
  const data = useMemo<Scene>(
    () => ({
      type: "excalidraw",
      version: 2,
      source: "renvodesk",
      elements: convertToExcalidrawElements(skeletons(scene, labels[locale])),
      appState: { viewBackgroundColor: "#ffffff" },
      files: {},
    }),
    [scene, locale],
  );
  return (
    <SketchCanvas
      scene={data}
      readOnly={false}
      locale={locale}
      onChange={() => {}}
    />
  );
}
