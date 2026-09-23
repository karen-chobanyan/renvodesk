import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig(base, {
  testIgnore: [],
  testMatch: "cad-prototype.spec.ts",
  use: { baseURL: "http://127.0.0.1:5175" },
  webServer: {
    command:
      "pnpm build:cad && pnpm exec vite preview --config vite.cad-prototype.config.ts --host 127.0.0.1 --port 5175 --strictPort",
    url: "http://127.0.0.1:5175/cad-prototype.html",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
