import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/tests/pactflow/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
