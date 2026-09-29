import { createAnalysisStore } from "./analysis-store.js";
import { buildApp } from "./app.js";
import { readConfig } from "./config.js";
import { createOpenAISiteNoteAnalyzer } from "./openai-analyzer.js";
import { createSupabaseGateway } from "./supabase-gateway.js";
import { createSupabaseRest } from "./supabase-rest.js";

const config = readConfig();
const app = buildApp(
  createSupabaseGateway(config),
  createAnalysisStore(createSupabaseRest(config)),
  config.openaiApiKey
    ? createOpenAISiteNoteAnalyzer(
        config.openaiApiKey,
        fetch,
        config.openaiApiOrigin,
        config.aiModels,
      )
    : undefined,
  {
    logger: {
      level: process.env.API_LOG_LEVEL ?? "info",
      redact: ["req.headers.authorization", "headers.authorization"],
    },
    maxConcurrentJobs: config.aiMaxConcurrentJobs,
  },
);

try {
  await app.listen({ host: "127.0.0.1", port: config.port });
  process.stdout.write(`RenvoDesk API listening on 127.0.0.1:${config.port}\n`);
} catch (error) {
  process.stderr.write(`RenvoDesk API failed to start: ${String(error)}\n`);
  process.exitCode = 1;
}
