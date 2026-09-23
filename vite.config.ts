import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
export default defineConfig({
  // Concurrent app/prototype servers must not overwrite each other’s optimized modules.
  cacheDir: "node_modules/.vite-app",
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: [
      "pdfjs-dist",
      "jspdf",
      "jspdf-autotable",
      "@excalidraw/excalidraw",
    ],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    manifest: true,
    rollupOptions: {
      input: ["index.html", "cad-canvas.html"],
      output: {
        manualChunks(id) {
          // Shared runtime helpers must not make React/landing import the CAD engine.
          if (
            id.includes("commonjsHelpers") ||
            id.includes("vite/preload-helper")
          )
            return "runtime-helpers";
          if (
            id.includes("node_modules") &&
            (id.includes("@mlightcad") ||
              id.includes("three") ||
              id.includes("opentype") ||
              id.includes("polybool"))
          )
            return "cad-engine";
          if (id.includes("node_modules") && id.includes("@supabase"))
            return "supabase";
        },
      },
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
