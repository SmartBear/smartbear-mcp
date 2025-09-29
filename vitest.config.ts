import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html", "lcov"],
      exclude: [
        "dist/**",
        "node_modules/**",
        "src/tests/**",
        "*.config.*",
        "**/*.d.ts",
        // Auto-generated API client files
        "src/bugsnag/client/api/*.ts",
        "src/bugsnag/client/index.ts",
        "src/bugsnag/client/configuration.ts",
        // Main entry point (tested via integration)
        "src/index.ts",
        // Other client implementations (not currently tested)
        "src/api-hub/client.ts",
        "src/reflect/client.ts",
        // Utility modules
        "src/common/bugsnag.ts",
        "src/common/types.ts",
        "src/pactflow/client/prompts.ts",
        "scripts/post-coverage-comment.js",
      ],
      // Coverage thresholds for business logic only
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 85,
        statements: 75,
        // Per-file thresholds for core files
        perFile: false,
      },
      // Generate more detailed reports
      reportOnFailure: true,
      all: true,
      // Clean coverage directory before tests
      clean: true,
      // Include source map support
      reportsDirectory: "./coverage",
    },
    // Include TypeScript files
    include: ["src/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    // Setup files
    // Placeholder for future setup files. Remove if not needed.
    setupFiles: [],
  },
  // Resolve imports correctly for ESM
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
