import { describe, expect, it, vi } from "vitest";
import {
  createOpenAISiteNoteAnalyzer,
  OpenAIRequestError,
  validateProposal,
} from "./site-note-analysis.js";

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

describe("site note analyzer", () => {
  it("transcribes audio and accepts one constrained proposal tool call", async () => {
    const requests: {
      path: string;
      body: unknown;
      authorization: string | null;
    }[] = [];
    const fetcher: typeof fetch = vi.fn(async (input, init) => {
      const path = new URL(input.toString()).pathname;
      requests.push({
        path,
        body: init?.body,
        authorization: new Headers(init?.headers).get("authorization"),
      });
      if (path === "/v1/audio/transcriptions")
        return Response.json({ text: "Vérifier la fenêtre demain." });
      return Response.json({
        output: [
          {
            type: "function_call",
            name: "propose_site_note",
            arguments: JSON.stringify({
              summary: "Fenêtre à vérifier.",
              tasks: [
                {
                  title: "Vérifier la fenêtre",
                  notes: "",
                  evidence: "Vérifier la fenêtre demain",
                },
              ],
            }),
          },
        ],
      });
    });
    const result = await createOpenAISiteNoteAnalyzer(
      "secret-test",
      fetcher,
    ).analyze({
      bytes: new Uint8Array([1, 2]),
      filename: "site-note.webm",
      mimeType: "audio/webm",
      project,
    });
    expect(result.transcript).toBe("Vérifier la fenêtre demain.");
    expect(result.tasks[0].title).toBe("Vérifier la fenêtre");
    expect(result.proposalStatus).toBe("ready");
    expect(result.omittedTaskCount).toBe(0);
    expect(requests.map((item) => item.path)).toEqual([
      "/v1/audio/transcriptions",
      "/v1/responses",
    ]);
    expect(
      requests.every((item) => item.authorization === "Bearer secret-test"),
    ).toBe(true);
    const body = JSON.parse(requests[1].body as string);
    expect(body.model).toBe("gpt-6-luna");
    expect(body.store).toBe(false);
    expect(body.tool_choice).toEqual({
      type: "function",
      name: "propose_site_note",
    });
    expect(body.input).toContain("Vérifier la fenêtre demain.");
  });

  it("rejects malformed proposal envelopes", () => {
    expect(() =>
      validateProposal({ summary: "ok", tasks: null }, "Quote"),
    ).toThrow();
    expect(() =>
      validateProposal(
        {
          summary: "",
          tasks: [
            {
              title: "Task",
              notes: "",
              evidence: "Quote",
            },
          ],
        },
        "Quote",
      ),
    ).toThrow();
  });

  it("omits invalid task suggestions while retaining verified tasks", () => {
    const proposal = {
      summary: "Fenêtre à vérifier.",
      tasks: [
        {
          title: "Vérifier la fenêtre",
          notes: "",
          evidence: "Vérifier la fenêtre demain",
        },
        {
          title: "Vérifier la porte",
          notes: "",
          evidence: "Vérifier la porte demain",
        },
      ],
    };
    expect(validateProposal(proposal, "Vérifier la fenêtre demain.")).toEqual({
      summary: proposal.summary,
      tasks: [proposal.tasks[0]],
      omittedTaskCount: 1,
    });
    expect(validateProposal(proposal, "Vérifier la porte demain.")).toEqual({
      summary: proposal.summary,
      tasks: [proposal.tasks[1]],
      omittedTaskCount: 1,
    });
    expect(
      validateProposal(
        { summary: "ok", tasks: Array(6).fill(proposal.tasks[0]) },
        "Vérifier la fenêtre demain.",
      ).omittedTaskCount,
    ).toBe(1);
  });

  it("identifies which provider request failed without returning its body", async () => {
    const fetcher: typeof fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ text: "Note" }))
      .mockResolvedValueOnce(
        Response.json(
          { error: { message: "private provider detail" } },
          { status: 429 },
        ),
      );
    await expect(
      createOpenAISiteNoteAnalyzer("secret-test", fetcher).analyze({
        bytes: new Uint8Array([1, 2]),
        filename: "site-note.webm",
        mimeType: "audio/webm",
        project,
      }),
    ).rejects.toEqual(new OpenAIRequestError("proposal", 429));
  });

  it("returns the transcript when the proposal tool call is malformed", async () => {
    const fetcher: typeof fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ text: "Vérifier la fenêtre." }))
      .mockResolvedValueOnce(Response.json({ output: [] }));
    const result = await createOpenAISiteNoteAnalyzer(
      "secret-test",
      fetcher,
    ).analyze({
      bytes: new Uint8Array([1, 2]),
      filename: "site-note.webm",
      mimeType: "audio/webm",
      project,
    });
    expect(result).toEqual({
      transcript: "Vérifier la fenêtre.",
      summary: "",
      tasks: [],
      omittedTaskCount: 0,
      proposalStatus: "unavailable",
    });
  });
});
