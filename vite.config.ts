import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    outDir: "dist",
    rollupOptions: {
      external: [
        "@modelcontextprotocol/sdk",
        "@bugsnag/js",
        "node-cache",
        "swagger-client",
        "zod",
        "zod-to-json-schema",
        /^node:.*/,
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
    minify: false,
    target: "node18",
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
});
