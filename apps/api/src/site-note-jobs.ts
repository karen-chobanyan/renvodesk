import type { AnalysisStore } from "./analysis-store.js";
import { failureReason } from "./failure-reason.js";
import type {
  Caller,
  ProjectContext,
  ProjectContextGateway,
} from "./project-context.js";
import type { SiteNoteAnalyzer } from "./site-note-analysis.js";

export interface SiteNoteJob {
  caller: Caller;
  analysisId: string;
  requestId: string;
  project: ProjectContext;
  fileId: string;
  today: string;
}

export interface JobLogger {
  info(fields: object, message: string): void;
  warn(fields: object, message: string): void;
}

export interface JobRunner {
  enqueue(job: SiteNoteJob): void;
  load(): { active: number; queued: number };
}

// In-process execution (decision 030, D2). State lives in the database; a
// lost process leaves rows whose lease expires and which then read as failed.
// Logs carry IDs, reason codes, timings and usage only — never content.
export function createJobRunner(deps: {
  gateway: ProjectContextGateway;
  store: AnalysisStore;
  analyzer: SiteNoteAnalyzer;
  logger: JobLogger;
  maxConcurrent: number;
  deadlineMs: number;
}): JobRunner {
  const { gateway, store, analyzer, logger } = deps;
  const queue: SiteNoteJob[] = [];
  let active = 0;

  function pump() {
    while (active < deps.maxConcurrent && queue.length > 0) {
      const job = queue.shift() as SiteNoteJob;
      active += 1;
      void run(job).finally(() => {
        active -= 1;
        pump();
      });
    }
  }

  async function fail(job: SiteNoteJob, fields: object, reason: string) {
    const org = job.project.organizationId;
    try {
      await store.fail(job.caller, org, job.analysisId, reason);
    } catch (error) {
      // The lease expiry will close the row; record why it stayed open.
      logger.warn(
        { ...fields, reason, recordReason: failureReason(error).reason },
        "site_note_job_fail_not_recorded",
      );
    }
    logger.warn({ ...fields, reason }, "site_note_job_failed");
  }

  async function run(job: SiteNoteJob) {
    const org = job.project.organizationId;
    const started = Date.now();
    const fields: Record<string, unknown> = {
      analysisId: job.analysisId,
      requestId: job.requestId,
      ...analyzer.versions,
    };
    const signal = AbortSignal.timeout(deps.deadlineMs);
    try {
      if (
        !(await store.advance(job.caller, org, job.analysisId, "transcribing"))
      )
        return fail(job, fields, "lease_expired");
      const audio = await gateway.readOwnerAudio(
        job.caller,
        org,
        job.project.id,
        job.fileId,
      );
      if (audio.kind !== "found")
        return fail(
          job,
          fields,
          audio.kind === "unsupported"
            ? "unsupported_audio"
            : "file_unavailable",
        );
      const transcribeStart = Date.now();
      const transcription = await analyzer.transcribe({
        ...audio.audio,
        signal,
      });
      fields.transcriptionMs = Date.now() - transcribeStart;
      if (!(await store.advance(job.caller, org, job.analysisId, "proposing")))
        return fail(job, fields, "lease_expired");
      const members = await gateway.readAssignableMembers(job.caller, org);
      const proposeStart = Date.now();
      const { usage, ...proposal } = await analyzer.propose({
        transcript: transcription.transcript,
        project: job.project,
        members,
        today: job.today,
        signal,
      });
      fields.proposalMs = Date.now() - proposeStart;
      const allUsage = { ...transcription.usage, ...usage };
      const saved = await store.complete(
        job.caller,
        org,
        job.analysisId,
        { transcript: transcription.transcript, ...proposal },
        allUsage,
      );
      // Rejected when the recording was deleted or the lease ran out meanwhile.
      if (!saved) return fail(job, fields, "result_rejected");
      logger.info(
        {
          ...fields,
          ...allUsage,
          proposalStatus: proposal.proposalStatus,
          taskCount: proposal.tasks.length,
          omittedTaskCount: proposal.omittedTaskCount,
          totalMs: Date.now() - started,
        },
        "site_note_job_ready",
      );
    } catch (error) {
      const { reason, upstreamStatus } = failureReason(error);
      await fail(job, { ...fields, upstreamStatus }, reason);
    }
  }

  return {
    enqueue(job) {
      queue.push(job);
      logger.info(
        { analysisId: job.analysisId, active, queued: queue.length },
        "site_note_job_queued",
      );
      pump();
    },
    load: () => ({ active, queued: queue.length }),
  };
}
