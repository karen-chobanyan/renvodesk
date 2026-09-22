import { requireSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { track } from "@/lib/telemetry/runtime";
import { type CostInput, validCost } from "./cost-model";
export type Cost = Database["public"]["Tables"]["project_costs"]["Row"];
export type Summary = {
  budget_cents: number | null;
  budget_revision: number | null;
  materials: string;
  labor: string;
  subcontractors: string;
  other: string;
  total: string;
};
export async function getCostSummary(
  org: string,
  project: string,
): Promise<Summary> {
  const { data, error } = await requireSupabase().rpc("project_cost_summary", {
    p_organization_id: org,
    p_project_id: project,
  });
  if (error) throw error;
  if (!data?.[0]) throw new Error("unavailable");
  return data[0];
}
export async function listCosts(org: string, project: string, offset = 0) {
  const { data, error } = await requireSupabase()
    .from("project_costs")
    .select("*")
    .eq("organization_id", org)
    .eq("project_id", project)
    .order("incurred_on", { ascending: false })
    .order("id")
    .range(offset, offset + 19);
  if (error) throw error;
  return data;
}
export async function saveBudget(
  org: string,
  project: string,
  cents: number,
  revision: number | null,
) {
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 999999999)
    throw new Error("invalid");
  const client = requireSupabase();
  if (revision === null) {
    const { data, error } = await client
      .from("project_budgets")
      .insert({
        organization_id: org,
        project_id: project,
        budget_cents: cents,
      })
      .select("*")
      .single();
    if (error?.code === "23505") return null;
    if (error) throw error;
    return data;
  }
  const { data, error } = await client
    .from("project_budgets")
    .update({ budget_cents: cents, revision: revision + 1 })
    .eq("organization_id", org)
    .eq("project_id", project)
    .eq("revision", revision)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function saveCost(
  org: string,
  project: string,
  id: string,
  input: CostInput,
  current?: Cost,
) {
  if (!validCost(input)) throw new Error("invalid");
  const client = requireSupabase();
  if (current) {
    const { data, error } = await client
      .from("project_costs")
      .update({ ...input, revision: current.revision + 1 })
      .eq("organization_id", org)
      .eq("project_id", project)
      .eq("id", current.id)
      .eq("revision", current.revision)
      .eq("voided", false)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  const { data, error } = await client
    .from("project_costs")
    .insert({ ...input, id, organization_id: org, project_id: project })
    .select("*")
    .single();
  if (!error) {
    track("expense_recorded", id);
    return data;
  }
  if (error.code === "23505") {
    const r = await client
      .from("project_costs")
      .select("*")
      .eq("organization_id", org)
      .eq("project_id", project)
      .eq("id", id)
      .single();
    if (!r.error) {
      track("expense_recorded", id);
      return r.data;
    }
  }
  throw error;
}
export async function voidCost(cost: Cost) {
  const { data, error } = await requireSupabase()
    .from("project_costs")
    .update({ voided: true, revision: cost.revision + 1 })
    .eq("organization_id", cost.organization_id)
    .eq("project_id", cost.project_id)
    .eq("id", cost.id)
    .eq("revision", cost.revision)
    .eq("voided", false)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}
