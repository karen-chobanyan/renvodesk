import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
export default defineConfig({
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules") && id.includes("@supabase"))
            return "supabase";
        },
      },
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
