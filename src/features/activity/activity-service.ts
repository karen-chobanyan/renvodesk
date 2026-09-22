import { requireSupabase } from "@/lib/supabase/client";
import {
  type ActivityCategory,
  type ActivityCursor,
  validCursor,
} from "./activity-model";

export async function listActivity(
  org: string,
  project: string,
  category: ActivityCategory = "all",
  cursor: ActivityCursor | null = null,
  size: 5 | 20 = 20,
) {
  let query = requireSupabase()
    .from("project_activity")
    .select("*")
    .eq("organization_id", org)
    .eq("project_id", project)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(size + 1);
  if (category !== "all") query = query.eq("category", category);
  if (cursor) {
    if (!validCursor(cursor)) throw new Error("Invalid activity cursor");
    query = query.or(
      `occurred_at.lt.${cursor.occurred_at},and(occurred_at.eq.${cursor.occurred_at},id.lt.${cursor.id})`,
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = data.slice(0, size);
  return { rows, next: data.length > size ? rows[rows.length - 1] : null };
}
export async function activityStartedAt() {
  const { data, error } = await requireSupabase()
    .from("project_activity_tracking")
    .select("started_at")
    .eq("singleton", true)
    .single();
  if (error) throw error;
  return data.started_at;
}
