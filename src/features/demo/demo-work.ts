import { addDays, weekStart } from "@/features/tasks/task-model";
import {
  type CostCategory,
  type DemoCost,
  type DemoEstimate,
  type DemoFile,
  type DemoLine,
  type DemoSiteNote,
  type DemoSketch,
  type DemoTask,
  type Text,
  tx,
} from "./demo-types";

/** Instant on a calendar day relative to `base`, in the viewer's time zone. */
export function demoInstant(base: string, offset: number, time = "09:00") {
  return new Date(`${addDays(base, offset)}T${time}:00`).toISOString();
}

function task(
  base: string,
  id: string,
  projectId: string,
  title: Text,
  status: DemoTask["status"],
  start: number | null,
  due: number | null,
  assignee: string | null,
  notes: Text | null = null,
): DemoTask {
  return {
    id,
    projectId,
    title,
    notes,
    status,
    start: start === null ? null : addDays(base, start),
    due: due === null ? null : addDays(base, due),
    assignee,
  };
}

type TaskArgs =
  Parameters<typeof task> extends [string, ...infer R] ? R : never;
export function demoTasks(base: string): DemoTask[] {
  const t = (...args: TaskArgs) => task(base, ...args);
  // Keep the first days of the current week populated whatever today is.
  const monday = Math.round(
    (Date.parse(weekStart(base)) - Date.parse(base)) / 86_400_000,
  );
  const weekly = (offset: number) => (offset < 0 ? "done" : "todo");
  return [
    t(
      "task-plasterboard",
      "maison-ixelles",
      tx("Réception des plaques de plâtre", "Plasterboard delivery"),
      weekly(monday),
      monday,
      monday,
      "lea",
    ),
    t(
      "task-site-meeting",
      "maison-namur",
      tx("Réunion de chantier hebdomadaire", "Weekly site meeting"),
      weekly(monday + 1),
      monday + 1,
      monday + 1,
      "alex",
    ),
    t(
      "task-tiles",
      "maison-ixelles",
      tx(
        "Confirmer le carrelage avec les clients",
        "Confirm tiles with the clients",
      ),
      "in_progress",
      null,
      1,
      "alex",
      tx(
        "Deux échantillons 60×60 déposés sur place. Délai fournisseur : 10 jours.",
        "Two 60×60 samples left on site. Supplier lead time: 10 days.",
      ),
    ),
    t(
      "task-partitions",
      "maison-ixelles",
      tx("Pose des cloisons de l’étage", "Install upstairs partitions"),
      "in_progress",
      -2,
      3,
      "lea",
    ),
    t(
      "task-electrician",
      "maison-ixelles",
      tx(
        "Passage de l’électricien — saignées cuisine",
        "Electrician visit — kitchen chases",
      ),
      "todo",
      2,
      2,
      "youssef",
    ),
    t(
      "task-worktops",
      "maison-ixelles",
      tx("Commander les plans de travail", "Order the worktops"),
      "todo",
      null,
      -2,
      "alex",
    ),
    t(
      "task-demolition",
      "maison-ixelles",
      tx("Démolition de la salle de bains", "Bathroom demolition"),
      "done",
      -9,
      -6,
      "lea",
    ),
    t(
      "task-photos",
      "maison-ixelles",
      tx(
        "Photos avant fermeture des cloisons",
        "Photos before closing partitions",
      ),
      "todo",
      null,
      null,
      null,
    ),
    t(
      "task-visit-lille",
      "appartement-lille",
      tx("Visite de chantier avec Mme Dubois", "Site visit with Ms Dubois"),
      "todo",
      null,
      4,
      "alex",
    ),
    t(
      "task-bathtub",
      "appartement-lille",
      tx("Dépose de la baignoire", "Remove the bathtub"),
      "in_progress",
      0,
      1,
      "pieter",
    ),
    t(
      "task-waterproofing",
      "appartement-lille",
      tx("Vérifier l’étanchéité de la douche", "Check shower waterproofing"),
      "todo",
      null,
      -1,
      "pieter",
    ),
    t(
      "task-survey-gent",
      "loft-gent",
      tx("Relevé des mesures du loft", "Measure the loft"),
      "todo",
      3,
      3,
      "alex",
    ),
    t(
      "task-joiner",
      "loft-gent",
      tx("Demander l’offre de l’ébéniste", "Request the joiner’s quote"),
      "todo",
      null,
      null,
      "alex",
    ),
    t(
      "task-paint-namur",
      "maison-namur",
      tx("Peinture des chambres", "Paint the bedrooms"),
      "in_progress",
      -1,
      5,
      "lea",
    ),
    t(
      "task-handover-namur",
      "maison-namur",
      tx(
        "Réception provisoire avec les clients",
        "Provisional handover with the clients",
      ),
      "todo",
      null,
      6,
      "alex",
    ),
    t(
      "task-joinery-namur",
      "maison-namur",
      tx("Retouches des menuiseries", "Joinery touch-ups"),
      "todo",
      null,
      null,
      "pieter",
    ),
    t(
      "task-meeting-utrecht",
      "studio-utrecht",
      tx("Rendez-vous avec Emma van Dijk", "Meeting with Emma van Dijk"),
      "todo",
      0,
      0,
      "alex",
    ),
    t(
      "task-file-duplex",
      "duplex-bruxelles",
      tx(
        "Remettre le dossier d’intervention ultérieure",
        "Hand over the maintenance file",
      ),
      "done",
      null,
      -12,
      "alex",
    ),
  ];
}

function cost(
  base: string,
  id: string,
  projectId: string,
  category: CostCategory,
  description: Text,
  amountCents: number,
  offset: number,
  notes: Text | null = null,
  voided = false,
): DemoCost {
  return {
    id,
    projectId,
    category,
    description,
    amountCents,
    date: addDays(base, offset),
    notes,
    voided,
  };
}

/** Splits a fictional actual-cost total into four ledger lines that add up exactly. */
function ledger(base: string, projectId: string, total: number): DemoCost[] {
  if (total <= 0) return [];
  const materials = Math.round(total * 0.4),
    labor = Math.round(total * 0.3),
    subcontractors = Math.round(total * 0.22);
  const other = total - materials - labor - subcontractors;
  return [
    cost(
      base,
      `${projectId}-materials`,
      projectId,
      "materials",
      tx("Matériaux de finition", "Finishing materials"),
      materials,
      -34,
    ),
    cost(
      base,
      `${projectId}-labor`,
      projectId,
      "labor",
      tx("Main-d’œuvre de l’équipe", "Crew labor"),
      labor,
      -21,
    ),
    cost(
      base,
      `${projectId}-sub`,
      projectId,
      "subcontractors",
      tx("Sous-traitance technique", "Technical subcontracting"),
      subcontractors,
      -14,
    ),
    cost(
      base,
      `${projectId}-other`,
      projectId,
      "other",
      tx("Location et évacuation", "Rental and disposal"),
      other,
      -6,
    ),
  ];
}

export function demoCosts(base: string): DemoCost[] {
  const p = "maison-ixelles";
  return [
    cost(
      base,
      "cost-tiles",
      p,
      "materials",
      tx("Carrelage grès cérame 60×60", "Porcelain tiles 60×60"),
      684000,
      -4,
      tx(
        "Livraison prévue la semaine prochaine.",
        "Delivery planned next week.",
      ),
    ),
    cost(
      base,
      "cost-plaster",
      p,
      "materials",
      tx("Plaques de plâtre et profilés", "Plasterboard and studs"),
      231540,
      -8,
    ),
    cost(
      base,
      "cost-paint",
      p,
      "materials",
      tx("Peinture et enduits", "Paint and fillers"),
      118460,
      -3,
    ),
    cost(
      base,
      "cost-demo-crew",
      p,
      "labor",
      tx("Équipe de démolition (3 jours)", "Demolition crew (3 days)"),
      486000,
      -9,
    ),
    cost(
      base,
      "cost-partition-crew",
      p,
      "labor",
      tx("Pose des cloisons (5 jours)", "Partition installation (5 days)"),
      620000,
      -2,
    ),
    cost(
      base,
      "cost-electrician",
      p,
      "subcontractors",
      tx(
        "Électricien — mise en conformité partielle",
        "Electrician — partial compliance upgrade",
      ),
      945000,
      -5,
    ),
    cost(
      base,
      "cost-plumber",
      p,
      "subcontractors",
      tx(
        "Plombier — déplacement des arrivées",
        "Plumber — relocate supply lines",
      ),
      575000,
      -7,
    ),
    cost(
      base,
      "cost-skip",
      p,
      "other",
      tx("Location conteneur 8 m³", "8 m³ skip rental"),
      110000,
      -10,
    ),
    cost(
      base,
      "cost-protection",
      p,
      "other",
      tx("Protection du chantier", "Site protection"),
      50000,
      -11,
    ),
    cost(
      base,
      "cost-skip-duplicate",
      p,
      "other",
      tx("Location conteneur (doublon)", "Skip rental (duplicate)"),
      110000,
      -10,
      tx("Facture saisie deux fois.", "Invoice entered twice."),
      true,
    ),
    ...ledger(base, "appartement-lille", 1350000),
    ...ledger(base, "loft-gent", 480000),
    ...ledger(base, "maison-namur", 4280000),
    ...ledger(base, "duplex-bruxelles", 4680000),
  ];
}

/** Cost budgets in cents; `null` shows the "not set" state. */
export const demoBudgets: Record<string, number | null> = {
  "maison-ixelles": 6200000,
  "appartement-lille": 3400000,
  "loft-gent": 9200000,
  "maison-namur": 4850000,
  "studio-utrecht": null,
  "duplex-bruxelles": 4400000,
};

const line = (
  id: string,
  text: Text,
  quantity: string,
  price: string,
  unit: DemoLine["unit"],
): DemoLine => ({ id, text, quantity, price, unit });

export function demoEstimates(base: string): DemoEstimate[] {
  const at = (offset: number, time?: string) => demoInstant(base, offset, time);
  return [
    {
      id: "ixelles-interieur",
      projectId: "maison-ixelles",
      title: tx("Rénovation intérieure", "Interior renovation"),
      status: "draft",
      revision: 4,
      lines: [
        line(
          "paint",
          tx(
            "Préparation et peinture des murs",
            "Wall preparation and painting",
          ),
          "120",
          "28.50",
          "m²",
        ),
        line(
          "floor",
          tx("Pose du revêtement de sol", "Floor covering installation"),
          "65",
          "74.00",
          "m²",
        ),
        line(
          "electric",
          tx(
            "Adaptation des prises électriques",
            "Electrical outlet adjustments",
          ),
          "12",
          "95.00",
          "item",
        ),
      ],
      events: [],
    },
    {
      id: "ixelles-cuisine",
      projectId: "maison-ixelles",
      title: tx("Cuisine — option îlot central", "Kitchen — island option"),
      status: "sent",
      revision: 2,
      lines: [
        line(
          "island",
          tx(
            "Fourniture et pose d’un îlot central",
            "Supply and install a kitchen island",
          ),
          "1",
          "7850.00",
          "fixed",
        ),
        line(
          "plumbing",
          tx("Raccordements eau et évacuation", "Water and drain connections"),
          "1",
          "1240.00",
          "fixed",
        ),
        line(
          "quartz",
          tx("Plan de travail en quartz", "Quartz worktop"),
          "6.4",
          "385.00",
          "m²",
        ),
      ],
      events: [
        {
          id: "ev-cuisine-sent",
          status: "sent",
          note: tx(
            "Envoyé par e-mail aux clients après la visite.",
            "Emailed to the clients after the visit.",
          ),
          at: at(-3, "16:40"),
        },
      ],
    },
    {
      id: "ixelles-demolition",
      projectId: "maison-ixelles",
      title: tx("Démolition et préparation", "Demolition and preparation"),
      status: "accepted",
      revision: 3,
      lines: [
        line(
          "walls",
          tx(
            "Démolition des cloisons non porteuses",
            "Demolish non-load-bearing partitions",
          ),
          "1",
          "4800.00",
          "fixed",
        ),
        line(
          "floors",
          tx("Dépose des revêtements de sol", "Remove floor coverings"),
          "85",
          "18.00",
          "m²",
        ),
        line(
          "rubble",
          tx("Évacuation et tri des gravats", "Rubble removal and sorting"),
          "1",
          "1650.00",
          "fixed",
        ),
      ],
      events: [
        {
          id: "ev-demo-sent",
          status: "sent",
          note: tx(
            "Remis en main propre lors du rendez-vous.",
            "Handed over at the meeting.",
          ),
          at: at(-30, "11:15"),
        },
        {
          id: "ev-demo-accepted",
          status: "accepted",
          note: tx(
            "Bon pour accord signé, scanné dans Documents.",
            "Signed approval, scanned into Documents.",
          ),
          at: at(-26, "18:05"),
        },
      ],
    },
    {
      id: "lille-sdb",
      projectId: "appartement-lille",
      title: tx("Salle de bains complète", "Complete bathroom"),
      status: "accepted",
      revision: 2,
      lines: [
        line(
          "shower",
          tx(
            "Douche à l’italienne avec paroi vitrée",
            "Walk-in shower with glass screen",
          ),
          "1",
          "4650.00",
          "fixed",
        ),
        line("tiles", tx("Faïence murale", "Wall tiling"), "24", "68.00", "m²"),
        line(
          "vanity",
          tx("Meuble vasque double", "Double vanity unit"),
          "1",
          "1380.00",
          "item",
        ),
      ],
      events: [
        {
          id: "ev-lille-sent",
          status: "sent",
          note: tx("Envoyé par e-mail.", "Sent by email."),
          at: at(-45, "10:00"),
        },
        {
          id: "ev-lille-accepted",
          status: "accepted",
          note: tx(
            "Accord écrit de la cliente par e-mail.",
            "Written approval from the client by email.",
          ),
          at: at(-41, "14:20"),
        },
      ],
    },
    {
      id: "lille-communs",
      projectId: "appartement-lille",
      title: tx("Peinture des parties communes", "Common areas painting"),
      status: "declined",
      revision: 1,
      lines: [
        line(
          "stairs",
          tx("Peinture de la cage d’escalier", "Stairwell painting"),
          "96",
          "24.00",
          "m²",
        ),
      ],
      events: [
        {
          id: "ev-communs-sent",
          status: "sent",
          note: tx("Transmis au syndic.", "Sent to the property manager."),
          at: at(-20, "09:30"),
        },
        {
          id: "ev-communs-declined",
          status: "declined",
          note: tx(
            "Le syndic reporte les travaux à l’an prochain.",
            "The property manager postponed to next year.",
          ),
          at: at(-12, "15:45"),
        },
      ],
    },
    {
      id: "gent-loft",
      projectId: "loft-gent",
      title: tx("Aménagement du loft", "Loft fit-out"),
      status: "draft",
      revision: 1,
      lines: [
        line(
          "mezzanine",
          tx("Mezzanine en structure acier", "Steel-frame mezzanine"),
          "1",
          "18400.00",
          "fixed",
        ),
        line(
          "insulation",
          tx("Isolation de la toiture", "Roof insulation"),
          "140",
          "62.00",
          "m²",
        ),
      ],
      events: [],
    },
    {
      id: "namur-finitions",
      projectId: "maison-namur",
      title: tx("Finitions et menuiseries", "Finishes and joinery"),
      status: "sent",
      revision: 2,
      lines: [
        line(
          "doors",
          tx("Remplacement des portes intérieures", "Replace interior doors"),
          "7",
          "420.00",
          "item",
        ),
        line(
          "skirting",
          tx("Plinthes en chêne", "Oak skirting boards"),
          "86",
          "19.50",
          "m²",
        ),
      ],
      events: [
        {
          id: "ev-namur-sent",
          status: "sent",
          note: tx(
            "Envoyé après la réunion de chantier.",
            "Sent after the site meeting.",
          ),
          at: at(-2, "17:10"),
        },
      ],
    },
    {
      id: "utrecht-studio",
      projectId: "studio-utrecht",
      title: tx("Rénovation du studio", "Studio renovation"),
      status: "draft",
      revision: 1,
      lines: [],
      events: [],
    },
    {
      id: "duplex-renovation",
      projectId: "duplex-bruxelles",
      title: tx("Rénovation du duplex", "Duplex renovation"),
      status: "accepted",
      revision: 5,
      lines: [
        line(
          "kitchen",
          tx("Cuisine équipée", "Fitted kitchen"),
          "1",
          "16800.00",
          "fixed",
        ),
        line(
          "floors",
          tx("Parquet chêne massif", "Solid oak flooring"),
          "110",
          "96.00",
          "m²",
        ),
        line(
          "paint",
          tx("Peinture intégrale", "Full repaint"),
          "380",
          "22.00",
          "m²",
        ),
      ],
      events: [
        {
          id: "ev-duplex-sent",
          status: "sent",
          note: tx("Envoyé par e-mail.", "Sent by email."),
          at: at(-120, "10:00"),
        },
        {
          id: "ev-duplex-accepted",
          status: "accepted",
          note: tx("Signé au bureau.", "Signed at the office."),
          at: at(-112, "16:00"),
        },
      ],
    },
  ];
}

export const demoFiles: DemoFile[] = [
  {
    id: "file-plan",
    projectId: "maison-ixelles",
    name: "Plan-rez-de-chaussee.dxf",
    kind: "dxf",
    sizeBytes: 20480,
    url: "/demo/plan-rez-de-chaussee.dxf",
  },
  {
    id: "file-photo",
    projectId: "maison-ixelles",
    name: "Sejour-avant-travaux.jpg",
    kind: "image",
    sizeBytes: 376832,
    url: "/images/renovation-interior.jpg",
  },
  {
    id: "file-demolition",
    projectId: "maison-ixelles",
    name: "Devis-demolition-accepte.pdf",
    kind: "pdf",
    sizeBytes: 48230,
    estimateId: "ixelles-demolition",
  },
  {
    id: "file-voice",
    projectId: "maison-ixelles",
    name: "Note-vocale-visite-cuisine.m4a",
    kind: "audio",
    sizeBytes: 612352,
  },
  {
    id: "file-lille-photo",
    projectId: "appartement-lille",
    name: "Salle-de-bains-existante.jpg",
    kind: "image",
    sizeBytes: 376832,
    url: "/images/renovation-interior.jpg",
  },
  {
    id: "file-lille-pdf",
    projectId: "appartement-lille",
    name: "Devis-salle-de-bains.pdf",
    kind: "pdf",
    sizeBytes: 45120,
    estimateId: "lille-sdb",
  },
  {
    id: "file-namur-plan",
    projectId: "maison-namur",
    name: "Plan-etage.dxf",
    kind: "dxf",
    sizeBytes: 20480,
    url: "/demo/plan-rez-de-chaussee.dxf",
  },
];

export const demoSketches: DemoSketch[] = [
  {
    id: "sketch-kitchen",
    projectId: "maison-ixelles",
    title: tx("Cuisine — implantation de l’îlot", "Kitchen — island layout"),
    revision: 3,
    scene: "kitchen",
  },
  {
    id: "sketch-bathroom",
    projectId: "maison-ixelles",
    title: tx(
      "Salle de bains — douche à l’italienne",
      "Bathroom — walk-in shower",
    ),
    revision: 1,
    scene: "bathroom",
  },
  {
    id: "sketch-facade",
    projectId: "appartement-lille",
    title: tx("Façade arrière — nouvelle fenêtre", "Rear facade — new window"),
    revision: 2,
    scene: "facade",
  },
];

export function demoSiteNote(base: string): DemoSiteNote {
  return {
    fileId: "file-voice",
    transcript: tx(
      "Visite cuisine avec Sophie et Marc. Ils confirment l’îlot central mais veulent un plan de travail plus clair. Il faut demander deux échantillons de quartz d’ici vendredi. Léa doit vérifier l’aplomb du mur côté fenêtre avant la pose des meubles. Youssef prévoit trois prises supplémentaires sur l’îlot.",
      "Kitchen visit with Sophie and Marc. They confirm the island but want a lighter worktop. Request two quartz samples by Friday. Léa should check the window-side wall is plumb before cabinets go in. Youssef plans three extra outlets on the island.",
    ),
    summary: tx(
      "Îlot confirmé ; plan de travail plus clair à choisir ; vérifications avant pose.",
      "Island confirmed; lighter worktop to choose; checks before installation.",
    ),
    tasks: [
      {
        id: "ai-quartz",
        title: tx(
          "Demander deux échantillons de quartz clair",
          "Request two light quartz samples",
        ),
        due: addDays(base, 3),
        assignee: "alex",
      },
      {
        id: "ai-plumb",
        title: tx(
          "Vérifier l’aplomb du mur côté fenêtre",
          "Check the window-side wall is plumb",
        ),
        due: addDays(base, 2),
        assignee: "lea",
      },
      {
        id: "ai-outlets",
        title: tx(
          "Prévoir trois prises sur l’îlot",
          "Plan three outlets on the island",
        ),
        due: null,
        assignee: "youssef",
      },
    ],
  };
}
