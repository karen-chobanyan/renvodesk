import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
// Explicit opt-in evaluation build. The application shares only the canvas entry.
export default defineConfig({
  // Concurrent app/prototype servers must not overwrite each other’s optimized modules.
  cacheDir: "node_modules/.vite-cad-prototype",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  optimizeDeps: {
    include: [
      "@mlightcad/cad-simple-viewer",
      "@mlightcad/data-model",
      "@mlightcad/mtext-renderer",
    ],
  },
  build: {
    outDir: "dist-cad-prototype",
    rollupOptions: {
      input: ["cad-prototype.html", "cad-canvas.html"],
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules") &&
            (id.includes("@mlightcad") ||
              id.includes("three") ||
              id.includes("opentype") ||
              id.includes("polybool"))
          )
            return "cad-engine";
        },
      },
    },
  },
});
