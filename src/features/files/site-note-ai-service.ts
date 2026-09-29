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

export type AnalysisProgress = "queued" | "transcribing" | "proposing";

export type SiteNoteAiStatus = {
  configured: boolean;
  enabled: boolean;
  remaining: number;
};

export type SiteNoteAiErrorCode =
  | "unavailable"
  | "disabled"
  | "limit"
  | "unsupported"
  | "not_found"
  | "job_failed"
  | "purged"
  | "timeout"
  | "failed";

// `limit` names the exhausted limit for 429; `reason` is the job's code.
export class SiteNoteAiError extends Error {
  constructor(
    readonly code: SiteNoteAiErrorCode,
    readonly detail?: string,
  ) {
    super(code);
  }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pollDeadlineMs = 4 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function nullableDate(value: unknown) {
  return value === null || (typeof value === "string" && validDate(value));
}

function isSuggestion(value: unknown): value is SiteNoteTaskSuggestion {
  if (!isRecord(value)) return false;
  return (
    typeof value.title === "string" &&
    typeof value.notes === "string" &&
    typeof value.evidence === "string" &&
    (value.assigneeId === null ||
      (typeof value.assigneeId === "string" && uuid.test(value.assigneeId))) &&
    nullableDate(value.startDate) &&
    nullableDate(value.dueDate)
  );
}

function isAnalysis(value: unknown): value is SiteNoteAnalysis {
  return (
    isRecord(value) &&
    typeof value.transcript === "string" &&
    typeof value.summary === "string" &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isSuggestion) &&
    typeof value.omittedTaskCount === "number" &&
    Number.isSafeInteger(value.omittedTaskCount) &&
    value.omittedTaskCount >= 0 &&
    (value.proposalStatus === "ready" || value.proposalStatus === "unavailable")
  );
}

async function api(path: string, init: RequestInit = {}) {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error || !data.session) throw new SiteNoteAiError("failed");
  return fetch(`/api/v1/organizations/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });
}

async function body(response: Response): Promise<Record<string, unknown>> {
  const value: unknown = await response.json().catch(() => null);
  return isRecord(value) ? value : {};
}

export async function readSiteNoteAiStatus(
  organizationId: string,
): Promise<SiteNoteAiStatus> {
  const response = await api(`${organizationId}/ai-status`);
  const value = await body(response);
  if (
    !response.ok ||
    typeof value.configured !== "boolean" ||
    typeof value.enabled !== "boolean" ||
    typeof value.remaining !== "number"
  )
    throw new SiteNoteAiError("failed");
  return {
    configured: value.configured,
    enabled: value.enabled,
    remaining: value.remaining,
  };
}

// The request ID must stay the same when retrying after a network error, so
// the server returns the same job instead of charging a new one.
export async function startSiteNoteAnalysis(
  organizationId: string,
  projectId: string,
  fileId: string,
  requestId: string,
): Promise<{ analysisId: string; ready: boolean }> {
  const response = await api(
    `${organizationId}/projects/${projectId}/files/${fileId}/ai-analysis`,
    { method: "POST", body: JSON.stringify({ requestId, today: today() }) },
  );
  const value = await body(response);
  if (response.ok && typeof value.analysisId === "string")
    return {
      analysisId: value.analysisId,
      ready: value.status === "ready",
    };
  if (response.status === 503 && value.error === "ai_unavailable")
    throw new SiteNoteAiError("unavailable");
  if (response.status === 403 && value.error === "ai_disabled")
    throw new SiteNoteAiError("disabled");
  if (response.status === 429)
    throw new SiteNoteAiError("limit", String(value.limit ?? ""));
  if (response.status === 415) throw new SiteNoteAiError("unsupported");
  if (response.status === 404) throw new SiteNoteAiError("not_found");
  throw new SiteNoteAiError("failed");
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

// Polls every 2 s, backing off to 5 s, for at most four minutes. Transient
// poll failures are retried; the job keeps running on the server regardless.
export async function waitForSiteNoteAnalysis(
  organizationId: string,
  projectId: string,
  analysisId: string,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: AnalysisProgress) => void;
  } = {},
): Promise<SiteNoteAnalysis> {
  const deadline = Date.now() + pollDeadlineMs;
  let delay = 0;
  while (Date.now() < deadline) {
    await wait(delay, options.signal);
    delay = Math.min(delay === 0 ? 2000 : delay + 1000, 5000);
    let response: Response;
    try {
      response = await api(
        `${organizationId}/projects/${projectId}/ai-analyses/${analysisId}`,
      );
    } catch (error) {
      if (options.signal?.aborted) throw error;
      continue;
    }
    if (response.status === 404) throw new SiteNoteAiError("not_found");
    if (!response.ok) continue;
    const view = await body(response);
    if (
      view.status === "queued" ||
      view.status === "transcribing" ||
      view.status === "proposing"
    ) {
      options.onProgress?.(view.status);
      continue;
    }
    if (view.status === "ready" && isAnalysis(view.result)) return view.result;
    if (view.status === "failed")
      throw new SiteNoteAiError("job_failed", String(view.failureReason ?? ""));
    if (view.status === "purged") throw new SiteNoteAiError("purged");
    throw new SiteNoteAiError("failed");
  }
  throw new SiteNoteAiError("timeout");
}
