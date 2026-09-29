import { describe, expect, it, vi } from "vitest";
import type { AnalysisStore } from "./analysis-store.js";
import type { ProjectContextGateway } from "./project-context.js";
import {
  type AnalysisUsage,
  OpenAIRequestError,
  type SiteNoteAnalyzer,
} from "./site-note-analysis.js";
import { createJobRunner, type SiteNoteJob } from "./site-note-jobs.js";

const caller = {
  userId: "33333333-3333-4333-8333-333333333333",
  accessToken: "token",
};
const job: SiteNoteJob = {
  caller,
  analysisId: "66666666-6666-4666-8666-666666666666",
  requestId: "77777777-7777-4777-8777-777777777777",
  fileId: "44444444-4444-4444-8444-444444444444",
  today: "2026-09-29",
  project: {
    id: "22222222-2222-4222-8222-222222222222",
    organizationId: "11111111-1111-4111-8111-111111111111",
    name: "Kitchen",
    clientName: "Client",
    city: "Namur",
    address: null,
    status: "active",
    revision: 1,
  },
};
const transcript = "Marc pose le carrelage vendredi.";

function setup(maxConcurrent = 2, deadlineMs = 5_000) {
  const gateway = {
    authenticate: vi.fn(),
    readOwnerProject: vi.fn(),
    readOwnerAudio: vi.fn(async () => ({
      kind: "found" as const,
      audio: {
        bytes: new Uint8Array([1]),
        filename: "site-note.webm",
        mimeType: "audio/webm" as const,
      },
    })),
    readAssignableMembers: vi.fn(async () => []),
  } satisfies ProjectContextGateway;
  const store = {
    begin: vi.fn(),
    advance: vi.fn(async (..._args: unknown[]) => true),
    complete: vi.fn(async () => true),
    fail: vi.fn(async () => true),
    read: vi.fn(),
    status: vi.fn(),
  } satisfies AnalysisStore;
  const analyzer = {
    versions: {
      promptVersion: "0123456789ab",
      transcriptionModel: "gpt-transcribe",
      proposalModel: "gpt-6-luna",
    },
    transcribe: vi.fn(
      async (_input: {
        signal?: AbortSignal;
      }): Promise<{ transcript: string; usage: AnalysisUsage }> => ({
        transcript,
        usage: { transcriptionSeconds: 9 },
      }),
    ),
    propose: vi.fn(async () => ({
      summary: "Carrelage.",
      tasks: [],
      omittedTaskCount: 0,
      proposalStatus: "ready" as const,
      usage: { inputTokens: 100 },
    })),
  } satisfies SiteNoteAnalyzer;
  const logger = { info: vi.fn(), warn: vi.fn() };
  const runner = createJobRunner({
    gateway,
    store,
    analyzer,
    logger,
    maxConcurrent,
    deadlineMs,
  });
  return { gateway, store, analyzer, logger, runner };
}

const org = job.project.organizationId;

describe("site-note job runner", () => {
  it("records each step and stores the result with merged usage", async () => {
    const { store, analyzer, gateway, logger, runner } = setup();
    runner.enqueue(job);
    await vi.waitFor(() => expect(store.complete).toHaveBeenCalled());
    expect(store.advance.mock.calls.map((call) => call[3])).toEqual([
      "transcribing",
      "proposing",
    ]);
    expect(gateway.readOwnerAudio).toHaveBeenCalledWith(
      caller,
      org,
      job.project.id,
      job.fileId,
    );
    expect(analyzer.propose).toHaveBeenCalledWith(
      expect.objectContaining({
        transcript,
        today: job.today,
        project: job.project,
      }),
    );
    expect(store.complete).toHaveBeenCalledWith(
      caller,
      org,
      job.analysisId,
      {
        transcript,
        summary: "Carrelage.",
        tasks: [],
        omittedTaskCount: 0,
        proposalStatus: "ready",
      },
      { transcriptionSeconds: 9, inputTokens: 100 },
    );
    await vi.waitFor(() =>
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          analysisId: job.analysisId,
          inputTokens: 100,
        }),
        "site_note_job_ready",
      ),
    );
    // Logs must never contain the recording's content.
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain("carrelage");
    expect(store.fail).not.toHaveBeenCalled();
  });

  it("stops without provider calls when the lease is already gone", async () => {
    const { store, analyzer, runner } = setup();
    store.advance.mockResolvedValueOnce(false);
    runner.enqueue(job);
    await vi.waitFor(() =>
      expect(store.fail).toHaveBeenCalledWith(
        caller,
        org,
        job.analysisId,
        "lease_expired",
      ),
    );
    expect(analyzer.transcribe).not.toHaveBeenCalled();
  });

  it("fails missing or unsupported audio before transcription", async () => {
    const { store, gateway, analyzer, runner } = setup();
    gateway.readOwnerAudio.mockResolvedValueOnce({
      kind: "unsupported",
    } as never);
    runner.enqueue(job);
    await vi.waitFor(() =>
      expect(store.fail).toHaveBeenCalledWith(
        caller,
        org,
        job.analysisId,
        "unsupported_audio",
      ),
    );
    expect(analyzer.transcribe).not.toHaveBeenCalled();
  });

  it("records bounded reasons for provider failures and rejected results", async () => {
    const failing = setup();
    failing.analyzer.transcribe.mockRejectedValueOnce(
      new OpenAIRequestError("transcription", 500),
    );
    failing.runner.enqueue(job);
    await vi.waitFor(() =>
      expect(failing.store.fail).toHaveBeenCalledWith(
        caller,
        org,
        job.analysisId,
        "transcription_upstream",
      ),
    );
    expect(failing.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ upstreamStatus: 500 }),
      "site_note_job_failed",
    );

    const rejected = setup();
    rejected.store.complete.mockResolvedValueOnce(false);
    rejected.runner.enqueue(job);
    await vi.waitFor(() =>
      expect(rejected.store.fail).toHaveBeenCalledWith(
        caller,
        org,
        job.analysisId,
        "result_rejected",
      ),
    );
  });

  it("fails a job that exceeds its deadline", async () => {
    const { store, analyzer, runner } = setup(1, 20);
    analyzer.transcribe.mockImplementationOnce(
      ({ signal }) =>
        new Promise((_resolve, reject) =>
          signal?.addEventListener("abort", () => reject(signal.reason)),
        ),
    );
    runner.enqueue(job);
    await vi.waitFor(() =>
      expect(store.fail).toHaveBeenCalledWith(
        caller,
        org,
        job.analysisId,
        "timeout",
      ),
    );
  });

  it("logs, rather than throws, when a failure cannot be recorded", async () => {
    const { store, logger, runner } = setup();
    store.advance.mockResolvedValueOnce(false);
    store.fail.mockRejectedValueOnce(
      new Error("Supabase Data API request failed"),
    );
    runner.enqueue(job);
    await vi.waitFor(() =>
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ recordReason: "data_upstream" }),
        "site_note_job_fail_not_recorded",
      ),
    );
  });

  it("runs at most the configured number of jobs at once", async () => {
    const { store, analyzer, runner } = setup(1);
    let release: () => void = () => {};
    analyzer.transcribe.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ transcript, usage: {} });
        }),
    );
    runner.enqueue(job);
    runner.enqueue({
      ...job,
      analysisId: "88888888-8888-4888-8888-888888888888",
    });
    await vi.waitFor(() =>
      expect(analyzer.transcribe).toHaveBeenCalledTimes(1),
    );
    expect(runner.load()).toEqual({ active: 1, queued: 1 });
    release();
    await vi.waitFor(() => expect(store.complete).toHaveBeenCalledTimes(2));
    expect(runner.load()).toEqual({ active: 0, queued: 0 });
  });
});
