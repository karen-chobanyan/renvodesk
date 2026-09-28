import { requireSupabase } from "@/lib/supabase/client";

export type SiteNoteAnalysis = {
  transcript: string;
  summary: string;
  tasks: { title: string; notes: string; evidence: string }[];
  omittedTaskCount: number;
  proposalStatus: "ready" | "unavailable";
};

export async function analyzeSiteNote(
  organizationId: string,
  projectId: string,
  fileId: string,
): Promise<SiteNoteAnalysis> {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error || !data.session) throw new Error("unauthorized");
  const response = await fetch(
    `/api/v1/organizations/${organizationId}/projects/${projectId}/files/${fileId}/ai-analysis`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    if (response.status === 503) {
      const body: unknown = await response.json().catch(() => null);
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        body.error === "ai_unavailable"
      )
        throw new Error("unavailable");
    }
    if (response.status === 415) throw new Error("unsupported");
    throw new Error("failed");
  }
  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== "object" ||
    !("transcript" in result) ||
    typeof result.transcript !== "string" ||
    !("summary" in result) ||
    typeof result.summary !== "string" ||
    !("tasks" in result) ||
    !Array.isArray(result.tasks) ||
    !("omittedTaskCount" in result) ||
    typeof result.omittedTaskCount !== "number" ||
    !Number.isSafeInteger(result.omittedTaskCount) ||
    result.omittedTaskCount < 0 ||
    !("proposalStatus" in result) ||
    (result.proposalStatus !== "ready" &&
      result.proposalStatus !== "unavailable")
  )
    throw new Error("failed");
  return result as SiteNoteAnalysis;
}
