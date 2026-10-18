import { initialProjects } from "@/features/projects/data";
import {
  type DemoActivity,
  type DemoActivityCategory,
  type Text,
  tx,
} from "./demo-types";
import { demoInstant } from "./demo-work";

type Entry = [
  offset: number,
  time: string,
  category: DemoActivityCategory,
  event: string,
  label: Text | null,
  actor: string,
  detail?: Text | null,
  amountCents?: number | null,
  entityId?: string,
];

const ixelles: Entry[] = [
  [-42, "10:12", "project", "project.created", null, "alex"],
  [
    -30,
    "11:15",
    "estimates",
    "estimate.sent",
    tx("Démolition et préparation", "Demolition and preparation"),
    "alex",
    tx(
      "Remis en main propre lors du rendez-vous.",
      "Handed over at the meeting.",
    ),
    null,
    "ixelles-demolition",
  ],
  [
    -26,
    "18:05",
    "estimates",
    "estimate.accepted",
    tx("Démolition et préparation", "Demolition and preparation"),
    "alex",
    null,
    798000,
    "ixelles-demolition",
  ],
  [-25, "08:40", "costs", "budget.created", null, "alex", null, 6200000],
  [
    -9,
    "07:55",
    "tasks",
    "task.created",
    tx("Démolition de la salle de bains", "Bathroom demolition"),
    "alex",
    null,
    null,
    "task-demolition",
  ],
  [
    -6,
    "16:30",
    "tasks",
    "task.updated",
    tx("Démolition de la salle de bains", "Bathroom demolition"),
    "lea",
    tx("Statut : Terminée", "Status: Done"),
    null,
    "task-demolition",
  ],
  [
    -5,
    "12:10",
    "costs",
    "cost.created",
    tx(
      "Électricien — mise en conformité partielle",
      "Electrician — partial compliance upgrade",
    ),
    "alex",
    null,
    945000,
    "cost-electrician",
  ],
  [
    -4,
    "17:02",
    "documents",
    "file.added",
    tx("Note-vocale-visite-cuisine.m4a", "Note-vocale-visite-cuisine.m4a"),
    "alex",
    null,
    null,
    "file-voice",
  ],
  [
    -3,
    "16:40",
    "estimates",
    "estimate.sent",
    tx("Cuisine — option îlot central", "Kitchen — island option"),
    "alex",
    tx(
      "Envoyé par e-mail aux clients après la visite.",
      "Emailed to the clients after the visit.",
    ),
    null,
    "ixelles-cuisine",
  ],
  [
    -2,
    "09:20",
    "documents",
    "sketch.published",
    tx("Cuisine — implantation de l’îlot", "Kitchen — island layout"),
    "alex",
    tx("Révision 3", "Revision 3"),
    null,
    "sketch-kitchen",
  ],
  [
    -1,
    "18:15",
    "costs",
    "cost.voided",
    tx("Location conteneur (doublon)", "Skip rental (duplicate)"),
    "alex",
    null,
    110000,
    "cost-skip-duplicate",
  ],
  [
    0,
    "08:05",
    "tasks",
    "task.updated",
    tx("Pose des cloisons de l’étage", "Install upstairs partitions"),
    "lea",
    tx("Statut : En cours", "Status: In progress"),
    null,
    "task-partitions",
  ],
];

function build(base: string, projectId: string, entries: Entry[]) {
  return entries.map(
    (
      [offset, time, category, event, label, actor, detail, amount, entityId],
      i,
    ) => ({
      id: `${projectId}-activity-${i}`,
      projectId,
      at: demoInstant(base, offset, time),
      category,
      event,
      label,
      detail: detail ?? null,
      amountCents: amount ?? null,
      actor,
      entityId,
    }),
  );
}

export function demoActivity(base: string): DemoActivity[] {
  const others = initialProjects
    .filter((p) => p.id !== "maison-ixelles")
    .flatMap((p, index) =>
      build(base, p.id, [
        [-60 + index * 7, "09:00", "project", "project.created", null, "alex"],
        [
          -3 - index,
          "14:30",
          "project",
          "project.updated",
          null,
          "alex",
          tx("Modifications : statut", "Changed: status"),
        ],
      ]),
    );
  return [...build(base, "maison-ixelles", ixelles), ...others].sort((a, b) =>
    b.at.localeCompare(a.at),
  );
}
