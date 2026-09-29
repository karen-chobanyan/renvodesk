import { createHash } from "node:crypto";
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

export type SiteNoteProposal = Omit<SiteNoteAnalysis, "transcript">;

export interface AnalysisUsage {
  transcriptionSeconds?: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AnalysisVersions {
  promptVersion: string;
  transcriptionModel: string;
  proposalModel: string;
}

export interface ProposalInput {
  transcript: string;
  project: ProjectContext;
  members: AssignableMember[];
  today: string;
}

// Two steps so a job can record progress, and so a stored transcript can
// later be re-proposed without paying for transcription again.
export interface SiteNoteAnalyzer {
  readonly versions: AnalysisVersions;
  transcribe(input: {
    bytes: Uint8Array;
    filename: string;
    mimeType: "audio/webm" | "audio/mp4";
    signal?: AbortSignal;
  }): Promise<{ transcript: string; usage: AnalysisUsage }>;
  propose(
    input: ProposalInput & { signal?: AbortSignal },
  ): Promise<SiteNoteProposal & { usage: AnalysisUsage }>;
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

// Evidence must quote the transcript, but models often retype apostrophes,
// quotes, spacing or case. Compare a typographically normalized form only.
export function normalizeForMatch(text: string) {
  return text
    .normalize("NFC")
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”«»„]/g, '"')
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/^[\s.,;:!?…]+|[\s.,;:!?…]+$/g, "");
}

export function containsEvidence(transcript: string, evidence: string) {
  const needle = normalizeForMatch(evidence);
  return needle.length > 0 && normalizeForMatch(transcript).includes(needle);
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
      !containsEvidence(transcript, task.evidence)
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

// Stored with every analysis so results from an older prompt are not reused.
export const promptVersion = createHash("sha256")
  .update(instructions)
  .digest("hex")
  .slice(0, 12);

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

export function proposalRequest(
  model: string,
  input: ProposalInput,
): { body: string; assignees: ReadonlyMap<string, string> } {
  const candidates = assigneeCandidates(input.members);
  const body = JSON.stringify({
    model,
    reasoning: { effort: "low" },
    store: false,
    parallel_tool_calls: false,
    instructions,
    input: proposalInput(
      input.project,
      input.today,
      candidates,
      input.transcript,
    ),
    tools: [proposalTool(candidates.map((c) => c.key))],
    tool_choice: { type: "function", name: "propose_site_note" },
  });
  return { body, assignees: new Map(candidates.map((c) => [c.key, c.userId])) };
}

const unavailableProposal: SiteNoteProposal = {
  summary: "",
  tasks: [],
  omittedTaskCount: 0,
  proposalStatus: "unavailable",
};

// A malformed proposal must not discard a valid (and already paid) transcript.
export function readProposal(
  response: unknown,
  transcript: string,
  assignees: ReadonlyMap<string, string>,
): SiteNoteProposal {
  if (!isRecord(response) || !Array.isArray(response.output))
    return unavailableProposal;
  const calls = response.output.filter(
    (item): item is Record<string, unknown> =>
      isRecord(item) && item.type === "function_call",
  );
  if (
    calls.length !== 1 ||
    calls[0].name !== "propose_site_note" ||
    typeof calls[0].arguments !== "string"
  )
    return unavailableProposal;
  try {
    const value: unknown = JSON.parse(calls[0].arguments);
    return {
      ...validateProposal(value, transcript, assignees),
      proposalStatus: "ready",
    };
  } catch {
    return unavailableProposal;
  }
}

function count(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

// Only numeric counters are kept; provider payloads are never stored.
export function readUsage(response: unknown): AnalysisUsage {
  if (!isRecord(response) || !isRecord(response.usage)) return {};
  const usage = response.usage;
  const entries = {
    transcriptionSeconds:
      usage.type === "duration" ? count(usage.seconds) : undefined,
    inputTokens: count(usage.input_tokens),
    outputTokens: count(usage.output_tokens),
  };
  return Object.fromEntries(
    Object.entries(entries).filter(([, v]) => v !== undefined),
  ) as AnalysisUsage;
}

export function readTranscript(response: unknown) {
  if (!isRecord(response) || !requiredText(response.text, 15000))
    throw new Error("Invalid AI transcription");
  return response.text.trim();
}
