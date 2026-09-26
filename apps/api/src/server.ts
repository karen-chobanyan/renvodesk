import { buildApp } from "./app.js";
import { readConfig } from "./config.js";
import { createOpenAISiteNoteAnalyzer } from "./site-note-analysis.js";
import { createSupabaseGateway } from "./supabase-gateway.js";

const config = readConfig();
const app = buildApp(
  createSupabaseGateway(config),
  config.openaiApiKey
    ? createOpenAISiteNoteAnalyzer(
        config.openaiApiKey,
        fetch,
        config.openaiApiOrigin,
      )
    : undefined,
);

try {
  await app.listen({ host: "127.0.0.1", port: config.port });
  process.stdout.write(`RenvoDesk API listening on 127.0.0.1:${config.port}\n`);
} catch (error) {
  process.stderr.write(`RenvoDesk API failed to start: ${String(error)}\n`);
  process.exitCode = 1;
}
