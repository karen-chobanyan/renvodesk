import {
  OpenAIRequestError,
  promptVersion,
  proposalRequest,
  readProposal,
  readTranscript,
  readUsage,
  type SiteNoteAnalyzer,
} from "./site-note-analysis.js";

export interface OpenAIModels {
  transcriptionModel: string;
  proposalModel: string;
}

const defaultModels: OpenAIModels = {
  transcriptionModel: "gpt-transcribe",
  proposalModel: "gpt-6-luna",
};

const requestTimeoutMs = 90_000;

export function createOpenAISiteNoteAnalyzer(
  apiKey: string,
  fetcher: typeof fetch = fetch,
  origin = "https://api.openai.com",
  models: OpenAIModels = defaultModels,
): SiteNoteAnalyzer {
  async function openAI(
    step: "transcription" | "proposal",
    path: string,
    body: FormData | string,
    signal: AbortSignal | undefined,
  ) {
    const timeout = AbortSignal.timeout(requestTimeoutMs);
    const response = await fetcher(`${origin}/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(typeof body === "string"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) throw new OpenAIRequestError(step, response.status);
    return (await response.json()) as unknown;
  }

  return {
    versions: { promptVersion, ...models },

    async transcribe({ bytes, filename, mimeType, signal }) {
      const form = new FormData();
      form.append("model", models.transcriptionModel);
      form.append(
        "file",
        new Blob([Buffer.from(bytes)], { type: mimeType }),
        filename,
      );
      const response = await openAI(
        "transcription",
        "audio/transcriptions",
        form,
        signal,
      );
      return {
        transcript: readTranscript(response),
        usage: readUsage(response),
      };
    },

    async propose({ signal, ...input }) {
      const { body, assignees } = proposalRequest(models.proposalModel, input);
      const response = await openAI("proposal", "responses", body, signal);
      return {
        ...readProposal(response, input.transcript, assignees),
        usage: readUsage(response),
      };
    },
  };
}
