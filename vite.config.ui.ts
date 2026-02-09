import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "src/bugsnag/ui/list-projects.html"),
    },
    minify: true,
    target: "es2020",
  },
});
