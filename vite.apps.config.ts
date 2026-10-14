import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/pactflow/client/apps/browser/main.tsx"),
      formats: ["iife"],
      name: "PactFlowMcpApps",
      fileName: () => "index.js",
    },
    outDir: "dist/mcp-apps",
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    target: "es2022",
  },
});
