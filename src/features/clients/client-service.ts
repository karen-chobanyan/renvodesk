import { requireSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type ClientInput = Pick<
  Client,
  "name" | "kind" | "email" | "phone" | "billing_address"
>;
export type PropertyInput = Pick<
  Property,
  "label" | "address" | "city" | "country"
>;
export async function listClients(org: string, search = "", offset = 0) {
  let query = requireSupabase()
    .from("clients")
    .select("*")
    .eq("organization_id", org);
  if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);
  const { data, error } = await query
    .order("name")
    .order("id")
    .range(offset, offset + 19);
  if (error) throw error;
  return data;
}
export async function listProperties(org: string, client: string, offset = 0) {
  const { data, error } = await requireSupabase()
    .from("properties")
    .select("*")
    .eq("organization_id", org)
    .eq("client_id", client)
    .order("label")
    .order("id")
    .range(offset, offset + 19);
  if (error) throw error;
  return data;
}
export async function saveClient(
  org: string,
  id: string,
  input: ClientInput,
  current?: Client,
) {
  const db = requireSupabase();
  if (current) {
    const { data, error } = await db
      .from("clients")
      .update({ ...input, revision: current.revision + 1 })
      .eq("organization_id", org)
      .eq("id", id)
      .eq("revision", current.revision)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  const { data, error } = await db
    .from("clients")
    .insert({ ...input, organization_id: org, id })
    .select("*")
    .single();
  if (!error) return data;
  if (error.code === "23505") {
    const result = await db
      .from("clients")
      .select("*")
      .eq("organization_id", org)
      .eq("id", id)
      .single();
    if (!result.error) return result.data;
  }
  throw error;
}
export async function saveProperty(
  org: string,
  client: string,
  id: string,
  input: PropertyInput,
  current?: Property,
) {
  const db = requireSupabase();
  if (current) {
    const { data, error } = await db
      .from("properties")
      .update({ ...input, revision: current.revision + 1 })
      .eq("organization_id", org)
      .eq("client_id", client)
      .eq("id", id)
      .eq("revision", current.revision)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  const { data, error } = await db
    .from("properties")
    .insert({ ...input, organization_id: org, client_id: client, id })
    .select("*")
    .single();
  if (!error) return data;
  if (error.code === "23505") {
    const result = await db
      .from("properties")
      .select("*")
      .eq("organization_id", org)
      .eq("client_id", client)
      .eq("id", id)
      .single();
    if (!result.error) return result.data;
  }
  throw error;
}
