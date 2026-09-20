import { requireSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { addDays, type TaskInput, validTask } from "./task-model";
export type Task = Database["public"]["Tables"]["project_tasks"]["Row"];
export const TASK_PAGE_SIZE = 50;
export type TaskFilter = {
  assignee?: string;
  project?: string;
  mode?: "week" | "overdue" | "undated";
  start?: string;
  today?: string;
};
export async function listTasks(
  org: string,
  filter: TaskFilter = {},
  offset = 0,
) {
  let query = requireSupabase()
    .from("project_tasks")
    .select("*, projects(name)")
    .eq("organization_id", org);
  if (filter.assignee) query = query.eq("assignee_id", filter.assignee);
  if (filter.project) query = query.eq("project_id", filter.project);
  if (filter.mode === "week" && filter.start) {
    const start = filter.start,
      end = addDays(start, 6);
    query = query.or(
      `and(start_date.lte.${end},due_date.gte.${start}),and(due_date.is.null,start_date.gte.${start},start_date.lte.${end}),and(start_date.is.null,due_date.gte.${start},due_date.lte.${end})`,
    );
  }
  if (filter.mode === "overdue" && filter.today)
    query = query.lt("due_date", filter.today).neq("status", "done");
  if (filter.mode === "undated")
    query = query
      .is("start_date", null)
      .is("due_date", null)
      .neq("status", "done");
  const { data, error } = await query
    .order("created_at")
    .order("id")
    .range(offset, offset + TASK_PAGE_SIZE - 1);
  if (error) throw error;
  return data;
}
export async function createTask(
  org: string,
  project: string,
  id: string,
  input: TaskInput,
) {
  if (!validTask(input)) throw new Error("invalid");
  const client = requireSupabase();
  const { data, error } = await client
    .from("project_tasks")
    .insert({ ...input, id, organization_id: org, project_id: project })
    .select("*")
    .single();
  if (!error) return data;
  if (error.code === "23505") {
    const recovery = await client
      .from("project_tasks")
      .select("*")
      .eq("organization_id", org)
      .eq("project_id", project)
      .eq("id", id)
      .single();
    if (!recovery.error) return recovery.data;
  }
  throw error;
}
export async function updateTask(task: Task, input: TaskInput) {
  if (!validTask(input)) throw new Error("invalid");
  const { data, error } = await requireSupabase()
    .from("project_tasks")
    .update({ ...input, revision: task.revision + 1 })
    .eq("organization_id", task.organization_id)
    .eq("project_id", task.project_id)
    .eq("id", task.id)
    .eq("revision", task.revision)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function deleteTask(task: Task) {
  const { data, error } = await requireSupabase()
    .from("project_tasks")
    .delete()
    .eq("organization_id", task.organization_id)
    .eq("project_id", task.project_id)
    .eq("id", task.id)
    .eq("revision", task.revision)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data;
}
