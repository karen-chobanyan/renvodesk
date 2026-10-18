import { useState } from "react";
import { activityCopy } from "@/features/activity/activity-copy";
import type { ActivityCategory } from "@/features/activity/activity-model";
import {
  type JournalEntry,
  JournalView,
  useJournalPosition,
} from "@/features/activity/journal-view";
import { exactMoney } from "@/features/costs/cost-model";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { DEMO_USER } from "./demo-directory";
import { type DemoSketch, say } from "./demo-types";

export function DemoJournal({
  projectId,
  compact = false,
  active = true,
  openSketch,
}: {
  projectId: string;
  compact?: boolean;
  active?: boolean;
  openSketch?: (sketch: DemoSketch) => void;
}) {
  const { locale } = useLocale(),
    c = activityCopy[locale];
  const { activity, members, projects, tasks, files, estimates, sketches } =
    useDemo();
  const [category, setCategory] = useState<ActivityCategory>("all");
  useJournalPosition(active && !compact);
  const base = `/projects/${projectId}`;
  const rows: JournalEntry[] = activity
    .filter((row) => row.projectId === projectId)
    .filter((row) => category === "all" || row.category === category)
    .slice(0, compact ? 3 : undefined)
    .map((row) => {
      const known = Object.hasOwn(c.events, row.event),
        deleted = row.event.endsWith(".deleted");
      const kind = row.event.split(".")[0];
      const sketch = sketches.find(
        (s) => s.projectId === projectId && s.id === row.entityId,
      );
      let target: string | undefined;
      if (known && !deleted) {
        if (kind === "project") target = `${base}?tab=overview`;
        else if (
          kind === "task" &&
          tasks.some((t) => t.projectId === projectId && t.id === row.entityId)
        )
          target = `${base}?tab=tasks&task=${row.entityId}`;
        else if (
          kind === "file" &&
          files.some((f) => f.projectId === projectId && f.id === row.entityId)
        )
          target = `${base}?tab=documents&file=${row.entityId}`;
        else if (
          kind === "estimate" &&
          estimates.some(
            (e) => e.projectId === projectId && e.id === row.entityId,
          )
        )
          target = `/estimates/${row.entityId}`;
        else if (["cost", "budget"].includes(kind))
          target = `${base}?tab=budget`;
        else if (kind === "sketch" && sketch) target = `${base}?tab=documents`;
      }
      return {
        id: row.id,
        at: row.at,
        event: row.event,
        entityId: row.entityId,
        category: row.category,
        actorId: row.actor,
        actor:
          row.actor === DEMO_USER
            ? c.you
            : (members.find((m) => m.id === row.actor)?.name ?? c.member),
        title: known ? c.events[row.event as keyof typeof c.events] : c.unknown,
        label: row.label
          ? say(row.label, locale)
          : kind === "project"
            ? (projects.find((p) => p.id === projectId)?.name ?? "")
            : "",
        detail: row.detail ? say(row.detail, locale) : "",
        amount:
          row.amountCents !== null
            ? `${exactMoney(BigInt(row.amountCents), locale)} · ${c.tax}`
            : "",
        target,
        open:
          target && sketch && openSketch ? () => openSketch(sketch) : undefined,
        actionLabel:
          kind === "sketch"
            ? c.openSketch
            : ["cost", "budget"].includes(kind)
              ? c.viewCosts
              : undefined,
      };
    });
  return (
    <JournalView
      rows={rows}
      compact={compact}
      category={category}
      setCategory={setCategory}
    />
  );
}
