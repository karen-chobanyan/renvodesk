import { loadEnv } from "vite";

const env = loadEnv("production", process.cwd(), "");
const expectedOrigin = "https://renvodesk.com";
const expectedMeasurementId = "G-Y94L907Y9E";
const checks = [
  ["SITE_URL", expectedOrigin],
  ["VITE_PUBLIC_ORIGIN", expectedOrigin],
  ["VITE_TELEMETRY_ENABLED", "true"],
  ["VITE_GA_MEASUREMENT_ID", expectedMeasurementId],
];
const mismatches = checks.filter(([name, expected]) => env[name] !== expected);

if (mismatches.length > 0) {
  console.error("Production analytics build is not configured:");
  for (const [name] of mismatches)
    console.error(`- ${name} is missing or incorrect`);
  console.error(
    "Set the public build values in .env.production.local, then retry.",
  );
  process.exitCode = 1;
} else {
  console.log(
    `Production analytics build configured for ${expectedOrigin} (${expectedMeasurementId}).`,
  );
}
