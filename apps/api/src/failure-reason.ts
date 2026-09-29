import { OpenAIRequestError } from "./site-note-analysis.js";

// Bounded reason codes for responses, stored job failures and logs. They name
// the failed stage only; raw upstream messages never leave the server.
const reasons: Record<string, string> = {
  "Supabase Auth request failed": "auth_upstream",
  "Supabase Data API request failed": "data_upstream",
  "Supabase request forbidden": "data_forbidden",
  "Unexpected Supabase Data API response": "data_response_invalid",
  "Unexpected Supabase project response": "project_response_invalid",
  "Unexpected Supabase file response": "file_response_invalid",
  "Unexpected Supabase team response": "team_response_invalid",
  "Unexpected Supabase analysis response": "analysis_response_invalid",
  "Supabase Storage download failed": "storage_upstream",
  "Unexpected Supabase Storage object size": "storage_size_mismatch",
  "Invalid AI transcription": "transcription_invalid",
};

export function failureReason(error: unknown): {
  reason: string;
  upstreamStatus?: number;
} {
  if (error instanceof OpenAIRequestError)
    return {
      reason:
        error.step === "transcription"
          ? "transcription_upstream"
          : "proposal_upstream",
      upstreamStatus: error.upstreamStatus,
    };
  if (error instanceof Error && error.name === "TimeoutError")
    return { reason: "timeout" };
  if (error instanceof Error && error.name === "AbortError")
    return { reason: "deadline_exceeded" };
  if (!(error instanceof Error)) return { reason: "internal_error" };
  return { reason: reasons[error.message] ?? "internal_error" };
}
