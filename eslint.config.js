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
  { rules: customRules }
]);
