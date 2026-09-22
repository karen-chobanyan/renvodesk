import { exactMoney } from "@/features/costs/cost-model";
import type { Database } from "@/lib/supabase/database.types";
import { activityCopy } from "./activity-copy";

export type Activity = Database["public"]["Tables"]["project_activity"]["Row"];
export const activityCategories = [
  "all",
  "project",
  "tasks",
  "documents",
  "estimates",
  "costs",
] as const;
export type ActivityCategory = (typeof activityCategories)[number];
export type ActivityCursor = Pick<Activity, "occurred_at" | "id">;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validCursor(cursor: ActivityCursor) {
  return (
    uuid.test(cursor.id) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      cursor.occurred_at,
    ) &&
    Number.isFinite(Date.parse(cursor.occurred_at))
  );
}
export function activityPresentation(row: Activity, locale: "fr" | "en") {
  const c = activityCopy[locale];
  const title = Object.hasOwn(c.events, row.event_type)
    ? c.events[row.event_type as keyof typeof c.events]
    : undefined;
  if (!title || row.payload_version !== 1)
    return { title: c.unknown, label: "", detail: "", amount: "", changes: "" };
  const payload =
    row.payload &&
    typeof row.payload === "object" &&
    !Array.isArray(row.payload)
      ? row.payload
      : {};
  const label =
    typeof payload.label === "string" ? payload.label.slice(0, 255) : "";
  const status = (value: unknown) =>
    typeof value === "string" && Object.hasOwn(c.statuses, value)
      ? c.statuses[value as keyof typeof c.statuses]
      : undefined;
  const from = status(payload.from_status),
    to = status(payload.to_status);
  const detail =
    from && to
      ? `${from} → ${to}`
      : row.event_type === "sketch.published" &&
          typeof payload.revision === "number" &&
          Number.isSafeInteger(payload.revision) &&
          payload.revision > 0
        ? `${c.revision} ${payload.revision}`
        : "";
  const amount =
    typeof payload.amount_cents === "string" &&
    /^\d{1,30}$/.test(payload.amount_cents)
      ? `${exactMoney(BigInt(payload.amount_cents), locale)} · ${c.tax}`
      : "";
  const fields = Array.isArray(payload.changed_fields)
    ? payload.changed_fields.flatMap((key) =>
        typeof key === "string" && Object.hasOwn(c.fields, key)
          ? [c.fields[key as keyof typeof c.fields]]
          : [],
      )
    : [];
  return {
    title,
    label,
    detail,
    amount,
    changes: fields.length ? `${c.changed}: ${fields.join(", ")}` : "",
  };
}
export function activityTarget(row: Activity) {
  if (
    row.payload_version !== 1 ||
    !Object.hasOwn(activityCopy.en.events, row.event_type) ||
    row.event_type.endsWith(".deleted")
  )
    return null;
  const base = `/workspace/${row.organization_id}/projects/${row.project_id}`;
  switch (row.entity_type) {
    case "project":
      return `${base}?tab=overview`;
    case "task":
      return `${base}?tab=tasks`;
    case "budget":
    case "cost":
      return `${base}?tab=budget`;
    case "file":
      return `${base}?tab=documents`;
    case "estimate":
      return `${base}/estimates/${row.entity_id}`;
    case "sketch":
      return `${base}/sketches/${row.entity_id}`;
    default:
      return null;
  }
}
export function activityDay(instant: string, locale: "fr" | "en") {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-BE" : "en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(instant));
}
