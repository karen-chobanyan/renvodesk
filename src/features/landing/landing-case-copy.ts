import type { LandingLocale } from "./landing-copy";

// Fictional kitchen job shown on the public landing page. Amounts are integer
// cents excluding tax; totals are derived in the component, never typed here.
export const landingCaseCopy = {
  fr: {
    eyebrow: "DU CONCRET, SUR VOS CHANTIERS",
    title: "Une cuisine à remplacer.\nUn chantier à coordonner.",
    intro:
      "Suivez une même rénovation de cuisine dans RenvoDesk : le devis, les corps de métier sur place, puis chaque dépense face au budget.",
    stepsLabel: "Étapes du chantier",
    steps: [
      {
        id: "estimate",
        number: "01",
        phase: "Avant les travaux",
        title: "Chiffrez la cuisine",
        text: "Détaillez la dépose, les meubles, la crédence et la pose. Exportez le devis en PDF et consignez la réponse du client.",
      },
      {
        id: "tasks",
        number: "02",
        phase: "Pendant les travaux",
        title: "Coordonnez les corps de métier",
        text: "Attribuez la plomberie, la plâtrerie et la pose à votre équipe, avec des dates claires pour chacun.",
      },
      {
        id: "costs",
        number: "03",
        phase: "Au fil des achats",
        title: "Contrôlez les dépenses",
        text: "Enregistrez matériaux, main-d’œuvre et sous-traitance, et voyez ce qu’il reste du budget de coûts.",
      },
    ],
    file: {
      label: "DOSSIER DE CHANTIER",
      project: "Cuisine · Maison du Parc",
      place: "Bruxelles",
      caption: "Exemple illustratif · données fictives · montants HT",
    },
    estimate: {
      title: "Devis de rénovation de cuisine",
      status: "Acceptation enregistrée",
      columns: ["Description", "Qté", "Prix unit. HT", "Total HT"],
      lines: [
        {
          description: "Dépose et évacuation de l’ancienne cuisine",
          quantity: 1,
          unit: "forfait",
          unitCents: 85_000,
        },
        {
          description: "Meubles et plan de travail en chêne",
          quantity: 1,
          unit: "forfait",
          unitCents: 620_000,
        },
        {
          description: "Crédence en carreaux de céramique",
          quantity: 8,
          unit: "m²",
          unitCents: 9_500,
        },
        {
          description: "Raccordements, pose et finitions",
          quantity: 1,
          unit: "forfait",
          unitCents: 145_000,
        },
      ],
      total: "Total HT",
      pdf: "PDF du devis exporté",
      decision: "Réponse du client consignée · 12 mars",
    },
    tasks: {
      title: "Tâches du chantier",
      period: "Semaine du 14 avril",
      rows: [
        {
          task: "Couper l’eau et déposer l’ancienne cuisine",
          trade: "Dépose",
          assignee: "Lucas",
          date: "14 avr.",
          state: "done",
          status: "Terminée",
        },
        {
          task: "Déplacer les arrivées d’eau",
          trade: "Plomberie",
          assignee: "Inès",
          date: "15–16 avr.",
          state: "progress",
          status: "En cours",
        },
        {
          task: "Enduire et peindre les murs",
          trade: "Plâtrerie · peinture",
          assignee: "Marc",
          date: "17–19 avr.",
          state: "todo",
          status: "À faire",
        },
        {
          task: "Poser les meubles et le plan de travail",
          trade: "Pose",
          assignee: "Lucas",
          date: "22 avr.",
          state: "todo",
          status: "À faire",
        },
      ],
    },
    costs: {
      title: "Budget et coûts",
      budget: "Budget de coûts",
      spent: "Dépensé",
      remaining: "Restant",
      share: "du budget dépensé",
      budgetCents: 700_000,
      rows: [
        {
          category: "Matériaux",
          note: "Meubles et plan de travail",
          cents: 340_000,
        },
        {
          category: "Main-d’œuvre",
          note: "Dépose et préparation",
          cents: 112_000,
        },
        { category: "Sous-traitants", note: "Plombier", cents: 41_000 },
      ],
      note: "Le budget restant n’est pas un bénéfice : la TVA et le chiffre d’affaires ne sont pas calculés ici.",
    },
  },
  en: {
    eyebrow: "BUILT AROUND REAL RENOVATION WORK",
    title: "A kitchen to replace.\nA renovation to coordinate.",
    intro:
      "Follow one kitchen renovation through RenvoDesk: the estimate, the trades on site, then every expense against the budget.",
    stepsLabel: "Project stages",
    steps: [
      {
        id: "estimate",
        number: "01",
        phase: "Before work",
        title: "Price the kitchen",
        text: "Itemise demolition, cabinets, splashback and installation. Export the estimate as a PDF and record the client’s answer.",
      },
      {
        id: "tasks",
        number: "02",
        phase: "During work",
        title: "Coordinate the trades",
        text: "Assign plumbing, plastering and fitting to your team, with clear dates for everyone.",
      },
      {
        id: "costs",
        number: "03",
        phase: "As you buy",
        title: "Keep spending in check",
        text: "Record materials, labour and subcontractors, and see what is left of the cost budget.",
      },
    ],
    file: {
      label: "PROJECT FILE",
      project: "Kitchen · Maison du Parc",
      place: "Brussels",
      caption: "Illustrative example · fictional data · amounts excl. tax",
    },
    estimate: {
      title: "Kitchen renovation estimate",
      status: "Acceptance recorded",
      columns: ["Description", "Qty", "Unit price", "Total"],
      lines: [
        {
          description: "Remove and dispose of the old kitchen",
          quantity: 1,
          unit: "fixed",
          unitCents: 85_000,
        },
        {
          description: "Oak cabinets and worktop",
          quantity: 1,
          unit: "fixed",
          unitCents: 620_000,
        },
        {
          description: "Ceramic tile splashback",
          quantity: 8,
          unit: "m²",
          unitCents: 9_500,
        },
        {
          description: "Connections, fitting and finishing",
          quantity: 1,
          unit: "fixed",
          unitCents: 145_000,
        },
      ],
      total: "Total excl. tax",
      pdf: "Estimate PDF exported",
      decision: "Client answer recorded · 12 March",
    },
    tasks: {
      title: "Project tasks",
      period: "Week of 14 April",
      rows: [
        {
          task: "Shut off water and remove the old kitchen",
          trade: "Demolition",
          assignee: "Lucas",
          date: "14 Apr",
          state: "done",
          status: "Done",
        },
        {
          task: "Move the water supply lines",
          trade: "Plumbing",
          assignee: "Inès",
          date: "15–16 Apr",
          state: "progress",
          status: "In progress",
        },
        {
          task: "Plaster and paint the walls",
          trade: "Plastering · painting",
          assignee: "Marc",
          date: "17–19 Apr",
          state: "todo",
          status: "To do",
        },
        {
          task: "Fit the cabinets and worktop",
          trade: "Fitting",
          assignee: "Lucas",
          date: "22 Apr",
          state: "todo",
          status: "To do",
        },
      ],
    },
    costs: {
      title: "Budget and costs",
      budget: "Cost budget",
      spent: "Spent",
      remaining: "Remaining",
      share: "of budget spent",
      budgetCents: 700_000,
      rows: [
        {
          category: "Materials",
          note: "Cabinets and worktop",
          cents: 340_000,
        },
        { category: "Labor", note: "Removal and preparation", cents: 112_000 },
        { category: "Subcontractors", note: "Plumber", cents: 41_000 },
      ],
      note: "Budget remaining is not profit: VAT and revenue are not calculated here.",
    },
  },
} as const;

export type CaseStepId =
  (typeof landingCaseCopy)[LandingLocale]["steps"][number]["id"];
