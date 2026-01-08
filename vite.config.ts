import { resolve } from "node:path";
import { defineConfig } from "vite";
import { builtinModules } from "node:module";

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    outDir: "dist",
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        "@modelcontextprotocol/sdk",
        "@bugsnag/js",
        "node-cache",
        "swagger-client",
        "zod",
        "zod-to-json-schema",
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
