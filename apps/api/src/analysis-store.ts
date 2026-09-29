import type { Caller } from "./project-context.js";
import type {
  AnalysisUsage,
  AnalysisVersions,
  SiteNoteAnalysis,
} from "./site-note-analysis.js";
import { SupabaseForbiddenError, type SupabaseRest } from "./supabase-rest.js";

export const beginOutcomes = [
  "created",
  "existing",
  "reused",
  "file_unavailable",
  "unsupported_audio",
  "disabled",
  "user_running",
  "company_daily",
  "global_monthly",
] as const;
export type BeginOutcome = (typeof beginOutcomes)[number];

export type JobStatus =
  | "queued"
  | "transcribing"
  | "proposing"
  | "ready"
  | "failed";

// What an owner may see. "purged" means the content was removed because the
// recording was deleted; expired rows are hidden by RLS.
export type AnalysisView =
  | { id: string; status: "queued" | "transcribing" | "proposing" }
  | { id: string; status: "ready"; result: SiteNoteAnalysis }
  | { id: string; status: "failed"; failureReason: string }
  | { id: string; status: "purged" };

export interface AnalysisStore {
  begin(
    caller: Caller,
    input: {
      organizationId: string;
      projectId: string;
      fileId: string;
      requestId: string;
    } & AnalysisVersions,
  ): Promise<{ analysisId: string | null; outcome: BeginOutcome }>;
  advance(
    caller: Caller,
    organizationId: string,
    id: string,
    status: "transcribing" | "proposing",
  ): Promise<boolean>;
  complete(
    caller: Caller,
    organizationId: string,
    id: string,
    analysis: SiteNoteAnalysis,
    usage: AnalysisUsage,
  ): Promise<boolean>;
  fail(
    caller: Caller,
    organizationId: string,
    id: string,
    reason: string,
  ): Promise<boolean>;
  read(
    caller: Caller,
    organizationId: string,
    projectId: string,
    id: string,
  ): Promise<AnalysisView | null>;
  status(
    caller: Caller,
    organizationId: string,
  ): Promise<{ enabled: boolean; remaining: number } | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function invalid(): never {
  throw new Error("Unexpected Supabase analysis response");
}

function toView(row: unknown, now: number): AnalysisView {
  if (!isRecord(row) || typeof row.id !== "string") invalid();
  const { id, status } = row;
  const running =
    status === "queued" || status === "transcribing" || status === "proposing";
  if (running) {
    // A lease that ran out means the job was lost (e.g. a restart).
    const lease = Date.parse(String(row.lease_expires_at));
    if (Number.isFinite(lease) && lease <= now)
      return { id, status: "failed", failureReason: "lease_expired" };
    return { id, status };
  }
  if (status === "failed")
    return {
      id,
      status,
      failureReason:
        typeof row.failure_reason === "string"
          ? row.failure_reason
          : "internal_error",
    };
  if (status !== "ready") invalid();
  if (row.transcript === null) return { id, status: "purged" };
  if (
    typeof row.transcript !== "string" ||
    typeof row.summary !== "string" ||
    !Array.isArray(row.proposal) ||
    typeof row.omitted_task_count !== "number" ||
    (row.proposal_status !== "ready" && row.proposal_status !== "unavailable")
  )
    invalid();
  return {
    id,
    status,
    result: {
      transcript: row.transcript,
      summary: row.summary,
      tasks: row.proposal as SiteNoteAnalysis["tasks"],
      omittedTaskCount: row.omitted_task_count,
      proposalStatus: row.proposal_status,
    },
  };
}

function single(value: unknown) {
  return Array.isArray(value) ? value[0] : undefined;
}

export function createAnalysisStore(rest: SupabaseRest): AnalysisStore {
  async function flag(name: string, caller: Caller, args: object) {
    const value = await rest.rpc(name, caller.accessToken, args);
    if (typeof value !== "boolean") invalid();
    return value;
  }

  return {
    async begin(caller, input) {
      const row = single(
        await rest.rpc("begin_site_note_analysis", caller.accessToken, {
          p_org: input.organizationId,
          p_project: input.projectId,
          p_file: input.fileId,
          p_request: input.requestId,
          p_prompt_version: input.promptVersion,
          p_transcription_model: input.transcriptionModel,
          p_proposal_model: input.proposalModel,
        }),
      );
      if (
        !isRecord(row) ||
        !beginOutcomes.includes(row.outcome as BeginOutcome) ||
        (row.analysis_id !== null && typeof row.analysis_id !== "string")
      )
        invalid();
      return {
        analysisId: row.analysis_id as string | null,
        outcome: row.outcome as BeginOutcome,
      };
    },

    advance: (caller, org, id, status) =>
      flag("advance_site_note_analysis", caller, {
        p_org: org,
        p_id: id,
        p_status: status,
      }),

    complete: (caller, org, id, analysis, usage) =>
      flag("complete_site_note_analysis", caller, {
        p_org: org,
        p_id: id,
        p_transcript: analysis.transcript,
        p_summary: analysis.summary,
        p_proposal_status: analysis.proposalStatus,
        p_proposal: analysis.tasks,
        p_omitted: analysis.omittedTaskCount,
        p_usage: usage,
      }),

    fail: (caller, org, id, reason) =>
      flag("fail_site_note_analysis", caller, {
        p_org: org,
        p_id: id,
        p_reason: reason,
      }),

    async read(caller, org, projectId, id) {
      const query = new URLSearchParams({
        select:
          "id,status,failure_reason,lease_expires_at,transcript,summary,proposal,proposal_status,omitted_task_count",
        organization_id: `eq.${org}`,
        project_id: `eq.${projectId}`,
        id: `eq.${id}`,
        limit: "1",
      });
      const rows = await rest.readRows(
        `/rest/v1/site_note_analyses?${query}`,
        caller.accessToken,
      );
      return rows[0] === undefined ? null : toView(rows[0], Date.now());
    },

    async status(caller, org) {
      try {
        const row = single(
          await rest.rpc("site_note_ai_status", caller.accessToken, {
            p_org: org,
          }),
        );
        if (
          !isRecord(row) ||
          typeof row.enabled !== "boolean" ||
          typeof row.remaining !== "number"
        )
          invalid();
        return { enabled: row.enabled, remaining: row.remaining };
      } catch (error) {
        if (error instanceof SupabaseForbiddenError) return null;
        throw error;
      }
    },
  };
}
