import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

/** @type {import("eslint").Linter.RulesRecord} */
const customRules = {
  "@typescript-eslint/no-explicit-any": "off", // (Explicit) any has its valid use cases
  "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }] // Allow unused arguments if they start with an underscore
}

export default defineConfig([
  {
    ignores: ["dist/**", "**/node_modules/**", "**/coverage/**"]
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node }
  },
  tseslint.configs.recommended,
  { rules: customRules },
  // Test-specific configuration
  {
    files: ["**/*.test.{js,ts}", "**/*.spec.{js,ts}", "**/tests/**/*.{js,ts}"],
    rules: {
      // Allow more flexible patterns in tests
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off", // Sometimes needed for test assertions
      "@typescript-eslint/no-unused-expressions": "off", // Vitest expect statements
      // Allow longer lines in tests for descriptive test names
      "max-len": ["error", { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true }],
      // Allow console statements in tests (for debugging)
      "no-console": "off"
    }
  }
]);
