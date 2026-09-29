import { readFileSync } from "node:fs";
import type { AssignableMember, ProjectContext } from "./project-context.js";

export interface SiteNoteTaskProposal {
  title: string;
  notes: string;
  evidence: string;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
}

export interface SiteNoteAnalysis {
  transcript: string;
  summary: string;
  tasks: SiteNoteTaskProposal[];
  omittedTaskCount: number;
  proposalStatus: "ready" | "unavailable";
}

export interface SiteNoteAnalyzer {
  analyze(input: {
    bytes: Uint8Array;
    filename: string;
    mimeType: "audio/webm" | "audio/mp4";
    project: ProjectContext;
    members: AssignableMember[];
    today: string;
  }): Promise<SiteNoteAnalysis>;
}

export class OpenAIRequestError extends Error {
  constructor(
    readonly step: "transcription" | "proposal",
    readonly upstreamStatus: number,
  ) {
    super("AI provider request failed");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function requiredText(value: unknown, max: number): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= max
  );
}

// Same calendar-date rule as project tasks: real YYYY-MM-DD between 1900 and 2100.
export function validCalendarDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "1900-01-01" ||
    value > "2100-12-31"
  )
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

// The model only sees opaque candidate keys; this maps them back to user IDs.
export function assigneeCandidates(members: AssignableMember[]) {
  return members.map((member, index) => ({
    key: `member_${index + 1}`,
    label: member.email.split("@")[0] ?? "",
    userId: member.userId,
  }));
}

function suggestedSchedule(task: Record<string, unknown>) {
  const startDate = validCalendarDate(task.startDate) ? task.startDate : null;
  const dueDate = validCalendarDate(task.dueDate) ? task.dueDate : null;
  if (startDate && dueDate && startDate > dueDate)
    return { startDate: null, dueDate: null };
  return { startDate, dueDate };
}

export function validateProposal(
  value: unknown,
  transcript: string,
  assignees: ReadonlyMap<string, string> = new Map(),
): Pick<SiteNoteAnalysis, "summary" | "tasks" | "omittedTaskCount"> {
  if (
    !isRecord(value) ||
    !requiredText(value.summary, 1000) ||
    !Array.isArray(value.tasks)
  )
    throw new Error("Invalid AI proposal");
  const tasks: SiteNoteTaskProposal[] = [];
  let omittedTaskCount = 0;
  for (const task of value.tasks) {
    if (
      !isRecord(task) ||
      !requiredText(task.title, 160) ||
      typeof task.notes !== "string" ||
      task.notes.length > 2000 ||
      !requiredText(task.evidence, 500) ||
      !transcript.includes(task.evidence.trim())
    ) {
      omittedTaskCount += 1;
      continue;
    }
    if (tasks.length === 5) {
      omittedTaskCount += 1;
      continue;
    }
    // Unknown assignee keys and invalid dates are dropped, not trusted: the
    // owner still sees the task and can choose them in the review form.
    tasks.push({
      title: task.title.trim(),
      notes: task.notes.trim(),
      evidence: task.evidence.trim(),
      assigneeId:
        typeof task.assignee === "string"
          ? (assignees.get(task.assignee) ?? null)
          : null,
      ...suggestedSchedule(task),
    });
  }
  return { summary: value.summary.trim(), tasks, omittedTaskCount };
}

function proposalTool(candidateKeys: string[]) {
  const nullableDate = {
    type: ["string", "null"],
    description: "Calendar date as YYYY-MM-DD, or null when not stated.",
  };
  return {
    type: "function",
    name: "propose_site_note",
    description:
      "Return a review-only summary and project task suggestions; this tool does not save tasks.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "tasks"],
      properties: {
        summary: { type: "string" },
        tasks: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "title",
              "notes",
              "evidence",
              "assignee",
              "startDate",
              "dueDate",
            ],
            properties: {
              title: { type: "string" },
              notes: { type: "string" },
              evidence: { type: "string" },
              assignee:
                candidateKeys.length > 0
                  ? {
                      anyOf: [
                        { type: "string", enum: candidateKeys },
                        { type: "null" },
                      ],
                    }
                  : { type: "null" },
              startDate: nullableDate,
              dueDate: nullableDate,
            },
          },
        },
      },
    },
  };
}

// Read once at startup. The path resolves from both src/ (dev) and dist/
// (build), so a missing prompt fails the server start instead of a request.
const instructions = readFileSync(
  new URL("../prompts/site-note-instructions.md", import.meta.url),
  "utf8",
).trim();

function proposalInput(
  project: ProjectContext,
  today: string,
  candidates: ReturnType<typeof assigneeCandidates>,
  transcript: string,
) {
  const weekday = new Intl.DateTimeFormat("en", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${today}T12:00:00Z`));
  const team =
    candidates.length > 0
      ? candidates.map((c) => `${c.key}: ${c.label}`).join("\n")
      : "(none)";
  return `Project: ${project.name}\nCity: ${project.city}\nToday: ${today} (${weekday})\nTeam (key: e-mail name):\n${team}\nTranscript:\n${transcript}`;
}

export function createOpenAISiteNoteAnalyzer(
  apiKey: string,
  fetcher: typeof fetch = fetch,
  origin = "https://api.openai.com",
): SiteNoteAnalyzer {
  async function openAI(
    path: string,
    body: FormData | string,
    contentType?: string,
  ) {
    const response = await fetcher(`${origin}/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
      body,
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok)
      throw new OpenAIRequestError(
        path === "audio/transcriptions" ? "transcription" : "proposal",
        response.status,
      );
    return (await response.json()) as unknown;
  }

  return {
    async analyze({ bytes, filename, mimeType, project, members, today }) {
      const form = new FormData();
      form.append("model", "gpt-transcribe");
      form.append(
        "file",
        new Blob([Buffer.from(bytes)], { type: mimeType }),
        filename,
      );
      const transcription = await openAI("audio/transcriptions", form);
      if (!isRecord(transcription) || !requiredText(transcription.text, 15000))
        throw new Error("Invalid AI transcription");
      const transcript = transcription.text.trim();
      const candidates = assigneeCandidates(members);
      const response = await openAI(
        "responses",
        JSON.stringify({
          model: "gpt-6-luna",
          reasoning: { effort: "low" },
          store: false,
          parallel_tool_calls: false,
          instructions,
          input: proposalInput(project, today, candidates, transcript),
          tools: [proposalTool(candidates.map((c) => c.key))],
          tool_choice: { type: "function", name: "propose_site_note" },
        }),
        "application/json",
      );
      try {
        if (!isRecord(response) || !Array.isArray(response.output))
          throw new Error("Invalid AI response");
        const calls = response.output.filter(
          (item): item is Record<string, unknown> =>
            isRecord(item) && item.type === "function_call",
        );
        if (
          calls.length !== 1 ||
          calls[0].name !== "propose_site_note" ||
          typeof calls[0].arguments !== "string"
        )
          throw new Error("Missing AI proposal tool call");
        let argumentsValue: unknown;
        try {
          argumentsValue = JSON.parse(calls[0].arguments);
        } catch {
          throw new Error("Invalid AI proposal");
        }
        const proposal = validateProposal(
          argumentsValue,
          transcript,
          new Map(candidates.map((c) => [c.key, c.userId])),
        );
        return { transcript, ...proposal, proposalStatus: "ready" };
      } catch (error) {
        if (
          !(error instanceof Error) ||
          ![
            "Invalid AI response",
            "Missing AI proposal tool call",
            "Invalid AI proposal",
          ].includes(error.message)
        )
          throw error;
        return {
          transcript,
          summary: "",
          tasks: [],
          omittedTaskCount: 0,
          proposalStatus: "unavailable",
        };
      }
    },
  };
}
