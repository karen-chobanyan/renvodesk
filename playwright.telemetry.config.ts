import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./checks",
  outputDir: ".cache/telemetry-test-results",
  fullyParallel: true,
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
