import { requireSupabase } from "@/lib/supabase/client";
import { track } from "@/lib/telemetry/runtime";
export type Organization = {
  id: string;
  name: string;
  country: string;
  default_language: string;
};
export async function getOrganizations(
  userId: string,
): Promise<Organization[]> {
  const { data, error } = await requireSupabase()
    .from("organization_memberships")
    .select("organization_id, organizations(id,name,country,default_language)")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return data.flatMap((row) => (row.organizations ? [row.organizations] : []));
}
export async function createOrganization(
  name: string,
  country: string,
  requestId: string,
) {
  const { data, error } = await requireSupabase().rpc("create_organization", {
    p_name: name.trim(),
    p_country: country,
    p_request_id: requestId,
  });
  if (error) throw error;
  if (data) track("company_created", requestId);
  return data;
}

export async function getOrganization(id: string) {
  const { data, error } = await requireSupabase()
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function saveContacts(
  id: string,
  revision: number,
  contacts: {
    contact_address: string;
    contact_email: string;
    contact_phone: string;
  },
) {
  const { data, error } = await requireSupabase()
    .from("organizations")
    .update({ ...contacts, contact_revision: revision + 1 })
    .eq("id", id)
    .eq("contact_revision", revision)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveWorkspacePreferences(
  id: string,
  revision: number,
  preferences: { country: "BE" | "FR" | "NL"; default_language: "fr" | "en" },
) {
  const { data, error } = await requireSupabase()
    .from("organizations")
    .update({ ...preferences, settings_revision: revision + 1 })
    .eq("id", id)
    .eq("settings_revision", revision)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}
