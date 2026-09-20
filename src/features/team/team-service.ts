import { requireSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
export type TeamMember =
  Database["public"]["Functions"]["team_members"]["Returns"][number];
export type Invitation =
  Database["public"]["Tables"]["team_invitations"]["Row"];
export async function listTeam(org: string, offset = 0) {
  const { data, error } = await requireSupabase().rpc("team_members", {
    p_org: org,
    p_offset: offset,
  });
  if (error) throw error;
  return data;
}
export async function listInvitations(org: string, offset = 0) {
  const { data, error } = await requireSupabase()
    .from("team_invitations")
    .select("*")
    .eq("organization_id", org)
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + 19);
  if (error) throw error;
  return data;
}
export async function invite(org: string, email: string, id: string) {
  const { data, error } = await requireSupabase().rpc("team_invite", {
    p_org: org,
    p_email: email.trim().toLowerCase(),
    p_id: id,
  });
  if (error) throw error;
  return data;
}
export async function invitation(id: string, accept = false) {
  const { data, error } = await requireSupabase().rpc("team_invitation", {
    p_id: id,
    p_accept: accept,
  });
  if (error) throw error;
  if (!data[0]) throw new Error("unavailable");
  return data[0];
}
export async function revoke(org: string, id: string) {
  const { error } = await requireSupabase().rpc("team_revoke", {
    p_org: org,
    p_id: id,
  });
  if (error) throw error;
}
export async function removeMember(org: string, user: string) {
  const { error } = await requireSupabase().rpc("team_remove", {
    p_org: org,
    p_user: user,
  });
  if (error) throw error;
}
export function invitePath(id: string) {
  return `/invite/${id}`;
}
export function invitationState(row: Invitation) {
  return row.revoked_at
    ? "revoked"
    : row.accepted_at
      ? "accepted"
      : new Date(row.expires_at).getTime() <= Date.now()
        ? "expired"
        : "pending";
}
