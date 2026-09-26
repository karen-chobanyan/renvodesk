import { describe, expect, it, vi } from "vitest";
import {
  createOpenAISiteNoteAnalyzer,
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

  it("rejects oversized or malformed tool proposals", () => {
    expect(() =>
      validateProposal(
        {
          summary: "ok",
          tasks: Array(6).fill({
            title: "Task",
            notes: "",
            evidence: "Quote",
          }),
        },
        "Quote",
      ),
    ).toThrow();
    expect(() =>
      validateProposal(
        {
          summary: "ok",
          tasks: [
            {
              title: "",
              notes: "",
              evidence: "Quote",
            },
          ],
        },
        "Quote",
      ),
    ).toThrow();
  });

  it("requires each supporting passage to occur verbatim in the transcript", () => {
    const proposal = {
      summary: "Fenêtre à vérifier.",
      tasks: [
        {
          title: "Vérifier la fenêtre",
          notes: "",
          evidence: "Vérifier la fenêtre demain",
        },
      ],
    };
    expect(validateProposal(proposal, "Vérifier la fenêtre demain.")).toEqual(
      proposal,
    );
    expect(() =>
      validateProposal(proposal, "Vérifier la porte demain."),
    ).toThrow("Invalid AI task proposal");
  });
});
