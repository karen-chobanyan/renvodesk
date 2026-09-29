import { describe, expect, it, vi } from "vitest";
import { createAnalysisStore } from "./analysis-store.js";
import { SupabaseForbiddenError, type SupabaseRest } from "./supabase-rest.js";

const caller = {
  userId: "33333333-3333-4333-8333-333333333333",
  accessToken: "token",
};
const org = "11111111-1111-4111-8111-111111111111";
const project = "22222222-2222-4222-8222-222222222222";
const id = "66666666-6666-4666-8666-666666666666";

function rest(overrides: Partial<SupabaseRest> = {}): SupabaseRest {
  return {
    request: vi.fn(),
    readRows: vi.fn(async () => []),
    rpc: vi.fn(),
    ...overrides,
  };
}

const future = new Date(Date.now() + 60_000).toISOString();
const past = new Date(Date.now() - 1_000).toISOString();

describe("analysis store", () => {
  it("passes versions to begin and validates the outcome", async () => {
    const rpc = vi.fn(async () => [{ analysis_id: id, outcome: "created" }]);
    const store = createAnalysisStore(rest({ rpc }));
    const input = {
      organizationId: org,
      projectId: project,
      fileId: "44444444-4444-4444-8444-444444444444",
      requestId: "77777777-7777-4777-8777-777777777777",
      promptVersion: "0123456789ab",
      transcriptionModel: "gpt-transcribe",
      proposalModel: "gpt-6-luna",
    };
    expect(await store.begin(caller, input)).toEqual({
      analysisId: id,
      outcome: "created",
    });
    expect(rpc).toHaveBeenCalledWith("begin_site_note_analysis", "token", {
      p_org: org,
      p_project: project,
      p_file: input.fileId,
      p_request: input.requestId,
      p_prompt_version: "0123456789ab",
      p_transcription_model: "gpt-transcribe",
      p_proposal_model: "gpt-6-luna",
    });
    rpc.mockResolvedValueOnce([
      { analysis_id: null, outcome: "surprise" },
    ] as never);
    await expect(store.begin(caller, input)).rejects.toThrow(
      "Unexpected Supabase analysis response",
    );
  });

  it("sends the result and numeric usage on completion", async () => {
    const rpc = vi.fn(async () => true);
    const store = createAnalysisStore(rest({ rpc }));
    const analysis = {
      transcript: "Note",
      summary: "Résumé",
      tasks: [],
      omittedTaskCount: 1,
      proposalStatus: "ready" as const,
    };
    expect(
      await store.complete(caller, org, id, analysis, { inputTokens: 5 }),
    ).toBe(true);
    expect(rpc).toHaveBeenCalledWith("complete_site_note_analysis", "token", {
      p_org: org,
      p_id: id,
      p_transcript: "Note",
      p_summary: "Résumé",
      p_proposal_status: "ready",
      p_proposal: [],
      p_omitted: 1,
      p_usage: { inputTokens: 5 },
    });
    rpc.mockResolvedValueOnce("yes" as never);
    await expect(store.fail(caller, org, id, "timeout")).rejects.toThrow();
  });

  it("reads a scoped row and derives the owner-visible state", async () => {
    const readRows = vi.fn();
    const store = createAnalysisStore(rest({ readRows }));
    readRows.mockResolvedValueOnce([
      { id, status: "proposing", lease_expires_at: future },
    ]);
    expect(await store.read(caller, org, project, id)).toEqual({
      id,
      status: "proposing",
    });
    const query = new URL(`https://x${readRows.mock.calls[0][0]}`).searchParams;
    expect(query.get("organization_id")).toBe(`eq.${org}`);
    expect(query.get("project_id")).toBe(`eq.${project}`);
    expect(query.get("id")).toBe(`eq.${id}`);

    readRows.mockResolvedValueOnce([
      { id, status: "queued", lease_expires_at: past },
    ]);
    expect(await store.read(caller, org, project, id)).toEqual({
      id,
      status: "failed",
      failureReason: "lease_expired",
    });
    readRows.mockResolvedValueOnce([{ id, status: "ready", transcript: null }]);
    expect(await store.read(caller, org, project, id)).toEqual({
      id,
      status: "purged",
    });
    readRows.mockResolvedValueOnce([
      {
        id,
        status: "ready",
        transcript: "Note",
        summary: "Résumé",
        proposal: [],
        proposal_status: "unavailable",
        omitted_task_count: 0,
      },
    ]);
    expect(await store.read(caller, org, project, id)).toEqual({
      id,
      status: "ready",
      result: {
        transcript: "Note",
        summary: "Résumé",
        tasks: [],
        omittedTaskCount: 0,
        proposalStatus: "unavailable",
      },
    });
    readRows.mockResolvedValueOnce([]);
    expect(await store.read(caller, org, project, id)).toBeNull();
  });

  it("returns null status for non-owners", async () => {
    const rpc = vi.fn(async () => [{ enabled: true, remaining: 3 }]);
    const store = createAnalysisStore(rest({ rpc }));
    expect(await store.status(caller, org)).toEqual({
      enabled: true,
      remaining: 3,
    });
    rpc.mockRejectedValueOnce(new SupabaseForbiddenError());
    expect(await store.status(caller, org)).toBeNull();
  });
});
