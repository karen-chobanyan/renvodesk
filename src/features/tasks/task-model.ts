export const statuses = ["todo", "in_progress", "done"] as const;
export type TaskStatus = (typeof statuses)[number];
export type TaskInput = {
  assignee_id?: string | null;
  title: string;
  notes: string;
  status: TaskStatus;
  start_date: string | null;
  due_date: string | null;
};
export function validDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "1900-01-01" ||
    value > "2100-12-31"
  )
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function validTask(input: TaskInput) {
  return (
    input.title.trim().length > 0 &&
    input.title.trim().length <= 160 &&
    input.notes.length <= 2000 &&
    statuses.includes(input.status) &&
    (!input.start_date || validDate(input.start_date)) &&
    (!input.due_date || validDate(input.due_date)) &&
    (!input.start_date || !input.due_date || input.start_date <= input.due_date)
  );
}
// Date-only values use UTC for arithmetic/formatting; today follows the user's local calendar.
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDays(day: string, count: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}
export function weekStart(day: string) {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return addDays(day, -(weekday + 6) % 7);
}
export function dateLabel(day: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}
export function onDay(
  task: Pick<TaskInput, "start_date" | "due_date">,
  day: string,
) {
  const start = task.start_date ?? task.due_date;
  const end = task.due_date ?? task.start_date;
  return !!start && !!end && start <= day && end >= day;
}
export function overdue(
  task: Pick<TaskInput, "due_date" | "status">,
  day: string,
) {
  return task.status !== "done" && !!task.due_date && task.due_date < day;
}
