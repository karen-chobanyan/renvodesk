import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createOpenAISiteNoteAnalyzer } from "./openai-analyzer.js";
import { OpenAIRequestError, promptVersion } from "./site-note-analysis.js";

const project = {
  id: "22222222-2222-4222-8222-222222222222",
  organizationId: "11111111-1111-4111-8111-111111111111",
  name: "Kitchen renovation",
  clientName: "Example client",
  city: "Brussels",
  address: null,
  status: "active",
  revision: 1,
};

const audio = {
  bytes: new Uint8Array([1, 2]),
  filename: "site-note.webm",
  mimeType: "audio/webm" as const,
};

function proposalResponse(args: unknown, usage?: unknown) {
  return Response.json({
    output: [
      {
        type: "function_call",
        name: "propose_site_note",
        arguments: JSON.stringify(args),
      },
    ],
    ...(usage ? { usage } : {}),
  });
}

describe("OpenAI site-note analyzer", () => {
  it("exposes allowlisted models and a prompt hash as versions", () => {
    const analyzer = createOpenAISiteNoteAnalyzer("secret-test", vi.fn());
    expect(analyzer.versions).toEqual({
      promptVersion,
      transcriptionModel: "gpt-transcribe",
      proposalModel: "gpt-6-luna",
    });
    expect(promptVersion).toMatch(/^[0-9a-f]{12}$/);
  });

  it("transcribes with the configured model and reports usage", async () => {
    let form: FormData | undefined;
    const fetcher: typeof fetch = vi.fn(async (input, init) => {
      expect(new URL(input.toString()).pathname).toBe(
        "/v1/audio/transcriptions",
      );
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer secret-test",
      );
      form = init?.body as FormData;
      return Response.json({
        text: " Vérifier la fenêtre demain. ",
        usage: { type: "duration", seconds: 12 },
      });
    });
    const result = await createOpenAISiteNoteAnalyzer(
      "secret-test",
      fetcher,
    ).transcribe(audio);
    expect(result).toEqual({
      transcript: "Vérifier la fenêtre demain.",
      usage: { transcriptionSeconds: 12 },
    });
    expect(form?.get("model")).toBe("gpt-transcribe");
  });

  it("rejects an empty transcription", async () => {
    const fetcher: typeof fetch = vi.fn(async () =>
      Response.json({ text: "  " }),
    );
    await expect(
      createOpenAISiteNoteAnalyzer("secret-test", fetcher).transcribe(audio),
    ).rejects.toThrow("Invalid AI transcription");
  });

  it("sends the prompt file, the owner's day and opaque team keys", async () => {
    let body: Record<string, unknown> = {};
    const fetcher: typeof fetch = vi.fn(async (input, init) => {
      expect(new URL(input.toString()).pathname).toBe("/v1/responses");
      body = JSON.parse(init?.body as string);
      return proposalResponse(
        {
          summary: "Carrelage vendredi.",
          tasks: [
            {
              title: "Poser le carrelage",
              notes: "",
              evidence: "Marc pose le carrelage vendredi",
              assignee: "member_2",
              startDate: null,
              dueDate: "2026-10-02",
            },
          ],
        },
        { input_tokens: 300, output_tokens: 80 },
      );
    });
    const result = await createOpenAISiteNoteAnalyzer(
      "secret-test",
      fetcher,
    ).propose({
      transcript: "Marc pose le carrelage vendredi.",
      project,
      members: [
        {
          userId: "44444444-4444-4444-8444-444444444444",
          email: "owner@example.test",
        },
        {
          userId: "55555555-5555-4555-8555-555555555555",
          email: "marc.dupont@example.test",
        },
      ],
      today: "2026-09-29",
    });
    expect(result.proposalStatus).toBe("ready");
    expect(result.tasks[0]).toMatchObject({
      assigneeId: "55555555-5555-4555-8555-555555555555",
      startDate: null,
      dueDate: "2026-10-02",
    });
    expect(result.usage).toEqual({ inputTokens: 300, outputTokens: 80 });
    expect(body.model).toBe("gpt-6-luna");
    expect(body.store).toBe(false);
    expect(body.instructions).toBe(
      readFileSync(
        new URL("../prompts/site-note-instructions.md", import.meta.url),
        "utf8",
      ).trim(),
    );
    const input = body.input as string;
    expect(input).toContain("Today: 2026-09-29 (Tuesday)");
    expect(input).toContain("member_2: marc.dupont");
    expect(input).not.toContain("example.test");
    expect(input).not.toContain("55555555");
    expect(JSON.stringify(body.tools)).toContain(
      '"enum":["member_1","member_2"]',
    );
  });

  it("identifies which provider request failed without its body", async () => {
    const fetcher: typeof fetch = vi.fn(async () =>
      Response.json({ error: { message: "private detail" } }, { status: 429 }),
    );
    const analyzer = createOpenAISiteNoteAnalyzer("secret-test", fetcher);
    await expect(analyzer.transcribe(audio)).rejects.toEqual(
      new OpenAIRequestError("transcription", 429),
    );
    await expect(
      analyzer.propose({
        transcript: "Note",
        project,
        members: [],
        today: "2026-09-29",
      }),
    ).rejects.toEqual(new OpenAIRequestError("proposal", 429));
  });

  it("aborts a provider call when the job signal fires", async () => {
    const fetcher: typeof fetch = vi.fn(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    const controller = new AbortController();
    const pending = createOpenAISiteNoteAnalyzer(
      "secret-test",
      fetcher,
    ).transcribe({ ...audio, signal: controller.signal });
    controller.abort(new DOMException("deadline", "TimeoutError"));
    await expect(pending).rejects.toMatchObject({ name: "TimeoutError" });
  });
});
