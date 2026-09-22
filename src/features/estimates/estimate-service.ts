import { requireSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { track } from "@/lib/telemetry/runtime";
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
  if (!error) {
    track("estimate_created", id);
    return data;
  }
  if (error.code === "23505") {
    const existing = await getEstimate(org, project, id);
    if (existing) {
      track("estimate_created", id);
      return existing;
    }
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
  if (data) track("estimate_saved", `${data.id}:${data.revision}`);
  return data;
}

export async function listCompanyEstimates(
  org: string,
  search = "",
  offset = 0,
) {
  let query = requireSupabase()
    .from("estimates")
    .select(
      "id,project_id,title,total_cents,revision,status,created_at,projects(name,client_name),match:projects()",
    )
    .eq("organization_id", org);
  if (search.trim()) {
    const pattern = `"%${search.trim().replaceAll("\\", "\\\\").replaceAll('"', '\\"')}%"`;
    query = query
      .or(`name.ilike.${pattern},client_name.ilike.${pattern}`, {
        referencedTable: "match",
      })
      .or(`title.ilike.${pattern},match.not.is.null`);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + 19);
  if (error) throw error;
  return data;
}

export async function estimateHistory(estimate: SavedEstimate) {
  const { data, error } = await requireSupabase()
    .from("estimate_events")
    .select("*")
    .eq("organization_id", estimate.organization_id)
    .eq("project_id", estimate.project_id)
    .eq("estimate_id", estimate.id)
    .order("from_revision", { ascending: false });
  if (error) throw error;
  return data;
}
export async function recordDecision(
  estimate: SavedEstimate,
  request: import("./estimate-workflow").DecisionRequest,
) {
  const { data, error } = await requireSupabase()
    .rpc("record_estimate_event", {
      p_org: estimate.organization_id,
      p_project: estimate.project_id,
      p_estimate: estimate.id,
      p_request: request.id,
      p_revision: request.revision,
      p_status: request.status,
      p_note: request.note,
    })
    .single();
  if (error) throw error;
  return data;
}
