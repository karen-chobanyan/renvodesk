import { defineConfig, devices } from "@playwright/test";

const portValue = process.env.PLAYWRIGHT_PORT ?? "5173";
const port = Number(portValue);
if (!/^\d+$/.test(portValue) || port < 1 || port > 65535) {
  throw new Error("PLAYWRIGHT_PORT must be a TCP port number");
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm dev --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    env: { VITE_AI_SITE_NOTES_ENABLED: "true" },
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
