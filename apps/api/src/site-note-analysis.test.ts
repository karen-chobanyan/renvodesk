import { describe, expect, it } from "vitest";
import {
  containsEvidence,
  normalizeForMatch,
  readProposal,
  readUsage,
  validateProposal,
} from "./site-note-analysis.js";

const noSuggestion = { assigneeId: null, startDate: null, dueDate: null };

describe("site note proposal validation", () => {
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
      tasks: [{ ...proposal.tasks[0], ...noSuggestion }],
      omittedTaskCount: 1,
    });
    expect(validateProposal(proposal, "Vérifier la porte demain.")).toEqual({
      summary: proposal.summary,
      tasks: [{ ...proposal.tasks[1], ...noSuggestion }],
      omittedTaskCount: 1,
    });
    expect(
      validateProposal(
        { summary: "ok", tasks: Array(6).fill(proposal.tasks[0]) },
        "Vérifier la fenêtre demain.",
      ).omittedTaskCount,
    ).toBe(1);
  });

  it("maps suggested assignee keys and keeps only valid calendar dates", () => {
    const assignees = new Map([
      ["member_1", "55555555-5555-4555-8555-555555555555"],
    ]);
    const base = { title: "Poser", notes: "", evidence: "Marc pose" };
    const result = validateProposal(
      {
        summary: "ok",
        tasks: [
          {
            ...base,
            assignee: "member_1",
            startDate: "2026-09-30",
            dueDate: "2026-10-02",
          },
          {
            ...base,
            assignee: "55555555-5555-4555-8555-555555555555",
            startDate: "2026-02-30",
            dueDate: "2026-10-02",
          },
          {
            ...base,
            assignee: "member_9",
            startDate: "2026-10-05",
            dueDate: "2026-10-02",
          },
          base,
        ],
      },
      "Marc pose le carrelage.",
      assignees,
    );
    expect(result.omittedTaskCount).toBe(0);
    expect(
      result.tasks.map(({ assigneeId, startDate, dueDate }) => ({
        assigneeId,
        startDate,
        dueDate,
      })),
    ).toEqual([
      {
        assigneeId: "55555555-5555-4555-8555-555555555555",
        startDate: "2026-09-30",
        dueDate: "2026-10-02",
      },
      { assigneeId: null, startDate: null, dueDate: "2026-10-02" },
      noSuggestion,
      noSuggestion,
    ]);
  });
});

describe("evidence matching", () => {
  it("normalizes quotes, whitespace, case, composition and edge punctuation", () => {
    expect(normalizeForMatch("  L’Électricien   doit\n VENIR. ")).toBe(
      "l'électricien doit venir",
    );
    expect(normalizeForMatch("«Poser» “le” carrelage…")).toBe(
      '"poser" "le" carrelage',
    );
    expect(normalizeForMatch("Café")).toBe(normalizeForMatch("Café"));
  });

  it("accepts formatting differences but rejects different words", () => {
    const transcript = "L’électricien doit  passer\nvendredi matin.";
    expect(containsEvidence(transcript, "l'électricien doit passer")).toBe(
      true,
    );
    expect(containsEvidence(transcript, "Passer vendredi matin")).toBe(true);
    expect(containsEvidence(transcript, "Le plombier doit passer")).toBe(false);
    expect(containsEvidence(transcript, " … ")).toBe(false);
  });

  it("keeps tasks whose evidence differs only by typography", () => {
    const result = validateProposal(
      {
        summary: "ok",
        tasks: [
          {
            title: "Appeler l’électricien",
            notes: "",
            evidence: "l'électricien doit passer",
          },
        ],
      },
      "L’électricien doit passer vendredi.",
    );
    expect(result.omittedTaskCount).toBe(0);
    expect(result.tasks[0].evidence).toBe("l'électricien doit passer");
  });
});

describe("provider response parsing", () => {
  const transcript = "Vérifier la fenêtre demain.";
  const call = (args: unknown) => ({
    output: [
      {
        type: "function_call",
        name: "propose_site_note",
        arguments: JSON.stringify(args),
      },
    ],
  });

  it("returns a validated proposal from exactly one tool call", () => {
    const proposal = readProposal(
      call({
        summary: "Fenêtre.",
        tasks: [
          {
            title: "Vérifier",
            notes: "",
            evidence: "Vérifier la fenêtre",
            assignee: null,
            startDate: null,
            dueDate: null,
          },
        ],
      }),
      transcript,
      new Map(),
    );
    expect(proposal.proposalStatus).toBe("ready");
    expect(proposal.tasks).toHaveLength(1);
  });

  it("marks malformed or ambiguous responses unavailable", () => {
    for (const response of [
      null,
      { output: [] },
      { output: [call({}).output[0], call({}).output[0]] },
      { output: [{ ...call({}).output[0], arguments: "{not json" }] },
      call({ summary: "", tasks: [] }),
    ])
      expect(readProposal(response, transcript, new Map())).toEqual({
        summary: "",
        tasks: [],
        omittedTaskCount: 0,
        proposalStatus: "unavailable",
      });
  });

  it("keeps only numeric usage counters", () => {
    expect(
      readUsage({ usage: { type: "duration", seconds: 42.5, extra: "x" } }),
    ).toEqual({ transcriptionSeconds: 42.5 });
    expect(
      readUsage({ usage: { input_tokens: 120, output_tokens: -1 } }),
    ).toEqual({ inputTokens: 120 });
    expect(readUsage({ usage: "lots" })).toEqual({});
  });
});
