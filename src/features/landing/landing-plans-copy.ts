import type { LandingLocale } from "./landing-copy";

export type PlanLayer = "furniture" | "dimensions" | "notes";

export const landingPlansCopy = {
  fr: {
    eyebrow: "PLANS ET CROQUIS",
    title: "Le plan du chantier,\ntoujours sous la main.",
    intro:
      "Ouvrez vos plans DXF dans le navigateur, sans logiciel de CAO. Dessinez un croquis ou annotez une photo pour montrer à l’équipe ce qui doit être fait.",
    viewer: {
      file: "maison-du-parc_rdc.dxf",
      layers: "Calques",
      layerNames: {
        furniture: "Mobilier",
        dimensions: "Cotes",
        notes: "Annotations",
      },
      cursor: "Position du curseur",
      scale: "1:50 · mm",
      caption:
        "Illustration · plan fictif · RenvoDesk affiche vos DXF en lecture seule, sans édition ni métrés",
      label:
        "Plan illustratif du rez-de-chaussée : cuisine, séjour et cellier, avec cotes et annotations de chantier",
    },
    drawing: {
      rooms: { kitchen: "CUISINE", living: "SÉJOUR", utility: "CELLIER" },
      notes: [
        "① Déplacer l’arrivée d’eau",
        "② Îlot : hauteur à valider",
        "③ Photo · seuil existant",
      ],
      title: "MAISON DU PARC — CUISINE",
      sheet: "PLAN REZ-DE-CHAUSSÉE",
      scale: "ÉCH. 1:50",
      revision: "A-101 · RÉV. B",
    },
    points: [
      {
        title: "Plans DXF",
        text: "Aperçu en lecture seule avec zoom et déplacement, y compris au doigt sur téléphone.",
      },
      {
        title: "Croquis annotés",
        text: "Dessinez à main levée, ajoutez une photo et annotez-la. Chaque enregistrement garde son historique.",
      },
      {
        title: "Rattachés au projet",
        text: "Plans et croquis restent avec le chantier, consultables par toute votre équipe.",
      },
    ],
  },
  en: {
    eyebrow: "PLANS AND SKETCHES",
    title: "The site plan,\nalways within reach.",
    intro:
      "Open your DXF plans in the browser, without CAD software. Draw a sketch or mark up a photo to show your team exactly what needs doing.",
    viewer: {
      file: "maison-du-parc_ground.dxf",
      layers: "Layers",
      layerNames: {
        furniture: "Furniture",
        dimensions: "Dimensions",
        notes: "Markup",
      },
      cursor: "Cursor position",
      scale: "1:50 · mm",
      caption:
        "Illustration · fictional plan · RenvoDesk shows your DXF files read-only, without editing or takeoff",
      label:
        "Illustrative ground-floor plan: kitchen, living room and utility room, with dimensions and site markup",
    },
    drawing: {
      rooms: { kitchen: "KITCHEN", living: "LIVING", utility: "UTILITY" },
      notes: [
        "① Move the water supply",
        "② Island: confirm height",
        "③ Photo · existing sill",
      ],
      title: "MAISON DU PARC — KITCHEN",
      sheet: "GROUND FLOOR PLAN",
      scale: "SCALE 1:50",
      revision: "A-101 · REV. B",
    },
    points: [
      {
        title: "DXF plans",
        text: "Read-only preview with zoom and pan, including touch gestures on phones.",
      },
      {
        title: "Annotated sketches",
        text: "Draw freehand, add a photo and mark it up. Every save keeps its history.",
      },
      {
        title: "Kept with the project",
        text: "Plans and sketches stay with the job, available to your whole team.",
      },
    ],
  },
} as const satisfies Record<LandingLocale, unknown>;

export type PlanDrawingCopy =
  (typeof landingPlansCopy)[LandingLocale]["drawing"];
