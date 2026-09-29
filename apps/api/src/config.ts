export interface ApiConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
  port: number;
  openaiApiKey?: string;
  openaiApiOrigin: "https://api.openai.com" | "https://eu.api.openai.com";
  aiModels: { transcriptionModel: string; proposalModel: string };
  aiMaxConcurrentJobs: number;
}

// Models are allowlisted: a new model must pass the evaluation set first.
const transcriptionModels = ["gpt-transcribe"];
const proposalModels = ["gpt-6-luna"];

function allowed(value: string, list: string[], name: string) {
  if (!list.includes(value))
    throw new Error(`${name} must be one of: ${list.join(", ")}`);
  return value;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const supabaseUrl = env.API_SUPABASE_URL;
  const supabasePublishableKey = env.API_SUPABASE_PUBLISHABLE_KEY;
  const port = Number(env.API_PORT ?? "3001");
  const openaiApiKey = env.OPENAI_API_KEY?.trim();
  const openaiApiOrigin = env.OPENAI_API_ORIGIN ?? "https://api.openai.com";
  const aiMaxConcurrentJobs = Number(env.AI_MAX_CONCURRENT_JOBS ?? "4");
  const aiModels = {
    transcriptionModel: allowed(
      env.AI_TRANSCRIPTION_MODEL ?? "gpt-transcribe",
      transcriptionModels,
      "AI_TRANSCRIPTION_MODEL",
    ),
    proposalModel: allowed(
      env.AI_PROPOSAL_MODEL ?? "gpt-6-luna",
      proposalModels,
      "AI_PROPOSAL_MODEL",
    ),
  };
  if (
    !Number.isInteger(aiMaxConcurrentJobs) ||
    aiMaxConcurrentJobs < 1 ||
    aiMaxConcurrentJobs > 16
  ) {
    throw new Error("AI_MAX_CONCURRENT_JOBS must be an integer from 1 to 16");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl ?? "");
  } catch {
    throw new Error("API_SUPABASE_URL must be a valid HTTP(S) URL");
  }
  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    (parsedUrl.protocol === "http:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname)) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error("API_SUPABASE_URL must be a valid HTTP(S) origin");
  }
  if (!supabasePublishableKey?.startsWith("sb_publishable_")) {
    throw new Error("API_SUPABASE_PUBLISHABLE_KEY must be a publishable key");
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("API_PORT must be an integer from 1 to 65535");
  }
  if (
    openaiApiOrigin !== "https://api.openai.com" &&
    openaiApiOrigin !== "https://eu.api.openai.com"
  ) {
    throw new Error("OPENAI_API_ORIGIN must be an approved OpenAI API origin");
  }

  return {
    supabaseUrl: parsedUrl.origin,
    supabasePublishableKey,
    port,
    openaiApiOrigin,
    aiModels,
    aiMaxConcurrentJobs,
    ...(openaiApiKey ? { openaiApiKey } : {}),
  };
}
