import { requireSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { StoredLine } from "./draft-model";
export type SavedEstimate = Database["public"]["Tables"]["estimates"]["Row"];
const summary = "id,title,total_cents,revision,status,created_at";
export async function listEstimates(org: string, project: string, offset = 0) {
  const { data, error } = await requireSupabase()
    .from("estimates")
    .select(summary)
    .eq("organization_id", org)
    .eq("project_id", project)
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + 19);
  if (error) throw error;
  return data;
}
export async function getEstimate(org: string, project: string, id: string) {
  const { data, error } = await requireSupabase()
    .from("estimates")
    .select("*")
    .eq("organization_id", org)
    .eq("project_id", project)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function createEstimate(
  org: string,
  project: string,
  id: string,
  title: string,
) {
  const { data, error } = await requireSupabase()
    .from("estimates")
    .insert({ organization_id: org, project_id: project, id, title })
    .select("*")
    .single();
  if (!error) return data;
  if (error.code === "23505") {
    const existing = await getEstimate(org, project, id);
    if (existing) return existing;
  }
  throw error;
}
export async function saveEstimate(
  estimate: SavedEstimate,
  title: string,
  lines: StoredLine[],
) {
  const { data, error } = await requireSupabase()
    .from("estimates")
    .update({ title, lines, revision: estimate.revision + 1 })
    .eq("organization_id", estimate.organization_id)
    .eq("project_id", estimate.project_id)
    .eq("id", estimate.id)
    .eq("revision", estimate.revision)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}
