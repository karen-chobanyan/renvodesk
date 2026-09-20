import { requireSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
export type SavedProject = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInput = Pick<
  SavedProject,
  "name" | "client_name" | "city" | "address"
>;
export const PROJECT_PAGE_SIZE = 20;
export async function listProjects(organizationId: string, offset = 0) {
  const { data, error } = await requireSupabase()
    .from("projects")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + PROJECT_PAGE_SIZE - 1);
  if (error) throw error;
  return data;
}
export async function createProject(
  organizationId: string,
  id: string,
  input: ProjectInput,
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("projects")
    .insert({ ...input, id, organization_id: organizationId })
    .select("*")
    .single();
  if (!error) return data;
  // A committed insert may have lost its response. Recover the same request without overwriting it.
  if (error.code === "23505") {
    const result = await client
      .from("projects")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .single();
    if (!result.error) return result.data;
  }
  throw error;
}

export async function getProject(organizationId: string, id: string) {
  const { data, error } = await requireSupabase()
    .from("projects")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function updateProject(
  project: SavedProject,
  input: ProjectInput & { status: string },
) {
  const { data, error } = await requireSupabase()
    .from("projects")
    .update({ ...input, revision: project.revision + 1 })
    .eq("organization_id", project.organization_id)
    .eq("id", project.id)
    .eq("revision", project.revision)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}
