import { today, validDate } from "@/features/tasks/task-model";
import { requireSupabase } from "@/lib/supabase/client";

export type SiteNoteTaskSuggestion = {
  title: string;
  notes: string;
  evidence: string;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
};

export type SiteNoteAnalysis = {
  transcript: string;
  summary: string;
  tasks: SiteNoteTaskSuggestion[];
  omittedTaskCount: number;
  proposalStatus: "ready" | "unavailable";
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nullableDate(value: unknown) {
  return value === null || (typeof value === "string" && validDate(value));
}

function isSuggestion(value: unknown): value is SiteNoteTaskSuggestion {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.title === "string" &&
    typeof task.notes === "string" &&
    typeof task.evidence === "string" &&
    (task.assigneeId === null ||
      (typeof task.assigneeId === "string" && uuid.test(task.assigneeId))) &&
    nullableDate(task.startDate) &&
    nullableDate(task.dueDate)
  );
}

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
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
      // The local calendar day lets the server resolve "tomorrow" or "Friday".
      body: JSON.stringify({ today: today() }),
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
    !result.tasks.every(isSuggestion) ||
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
