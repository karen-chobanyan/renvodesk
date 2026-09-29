import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { fileCopy } from "./file-copy";
import {
  type AnalysisProgress,
  readSiteNoteAiStatus,
  SiteNoteAiError,
  type SiteNoteAiErrorCode,
  type SiteNoteAiStatus,
  type SiteNoteAnalysis,
  startSiteNoteAnalysis,
  waitForSiteNoteAnalysis,
} from "./site-note-ai-service";

type Running = { fileId: string; progress: AnalysisProgress | "starting" };

export type SiteNoteAnalysisState = ReturnType<typeof useSiteNoteAnalysis>;

// Owns AI job start/poll state for one project's documents. Results live in
// the database for 30 days, so a later click on the same note reopens them.
export function useSiteNoteAnalysis(
  organizationId: string,
  projectId: string,
  enabled: boolean,
) {
  const [status, setStatus] = useState<SiteNoteAiStatus | null>(null);
  const [running, setRunning] = useState<Running | null>(null);
  const [error, setError] = useState<SiteNoteAiError | null>(null);
  const [review, setReview] = useState<{
    key: string;
    analysis: SiteNoteAnalysis;
  } | null>(null);
  const requestIds = useRef(new Map<string, string>());
  const polling = useRef<AbortController | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await readSiteNoteAiStatus(organizationId));
    } catch {
      // The server still enforces availability; keep the action visible.
      setStatus(null);
    }
  }, [organizationId]);

  useEffect(() => {
    if (enabled) void refreshStatus();
    return () => polling.current?.abort();
  }, [enabled, refreshStatus]);

  async function analyze(fileId: string) {
    if (!enabled || running) return;
    // Reuse the ID after an unknown outcome so a retry cannot start a second job.
    const requestId = requestIds.current.get(fileId) ?? crypto.randomUUID();
    requestIds.current.set(fileId, requestId);
    const controller = new AbortController();
    polling.current = controller;
    setRunning({ fileId, progress: "starting" });
    setError(null);
    try {
      const { analysisId } = await startSiteNoteAnalysis(
        organizationId,
        projectId,
        fileId,
        requestId,
      );
      // A job exists for this request; the next click is a new request.
      requestIds.current.delete(fileId);
      const analysis = await waitForSiteNoteAnalysis(
        organizationId,
        projectId,
        analysisId,
        {
          signal: controller.signal,
          onProgress: (progress) => setRunning({ fileId, progress }),
        },
      );
      setReview({ key: analysisId, analysis });
    } catch (caught) {
      if (controller.signal.aborted) return;
      const failure =
        caught instanceof SiteNoteAiError
          ? caught
          : new SiteNoteAiError("failed");
      if (failure.code !== "failed") requestIds.current.delete(fileId);
      setError(failure);
    } finally {
      if (!controller.signal.aborted) {
        setRunning(null);
        void refreshStatus();
      }
    }
  }

  const available = !status || (status.configured && status.enabled);
  return {
    status,
    available,
    running,
    error,
    review,
    analyze,
    closeReview: () => setReview(null),
  };
}

const errorKey: Record<SiteNoteAiErrorCode, keyof (typeof fileCopy)["en"]> = {
  unavailable: "aiUnavailable",
  disabled: "aiDisabled",
  limit: "aiLimitCompany",
  unsupported: "aiUnsupported",
  not_found: "aiNotFound",
  job_failed: "aiJobFailed",
  purged: "aiPurged",
  timeout: "aiTimeout",
  failed: "aiFailed",
};

const limitKey: Record<string, keyof (typeof fileCopy)["en"]> = {
  user_running: "aiLimitRunning",
  company_daily: "aiLimitCompany",
  global_monthly: "aiLimitGlobal",
};

export function SiteNoteAnalysisNotices({
  state,
}: {
  state: SiteNoteAnalysisState;
}) {
  const { locale } = useLocale();
  const c = fileCopy[locale];
  const { running, error, status } = state;
  const progressKey = {
    starting: "aiStarting",
    queued: "aiQueued",
    transcribing: "aiTranscribing",
    proposing: "aiProposing",
  } as const;
  return (
    <>
      {running && <p role="status">{c[progressKey[running.progress]]}</p>}
      {error && (
        <p role="alert" className="error-message">
          {
            c[
              error.code === "limit"
                ? (limitKey[error.detail ?? ""] ?? "aiLimitCompany")
                : errorKey[error.code]
            ]
          }
        </p>
      )}
      {status?.configured && !status.enabled && (
        <p className="helper-text">{c.aiDisabled}</p>
      )}
      {status?.configured && status.enabled && (
        <p className="helper-text">
          {c.aiRemaining.replace("{count}", String(status.remaining))}
        </p>
      )}
    </>
  );
}
