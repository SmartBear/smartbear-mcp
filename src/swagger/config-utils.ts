/**
 * Configuration utilities for Swagger client
 * Handles backward compatibility with legacy environment variables
 */

import { getEnv, setEnv } from "../common/env.ts";

// Apply the fallback immediately when this module is imported. Placed above
// the (hoisted) function declaration so this remains the last statement in
// the module, ahead of the export.
applySwaggerApiKeyFallback();

/**
 * Apply API_HUB_API_KEY fallback to SWAGGER_API_KEY if needed
 * This modifies process.env to enable backward compatibility
 * @deprecated API_HUB_API_KEY support - TODO: Remove after migration period (May 2026)
 */
export function applySwaggerApiKeyFallback(): void {
  // If SWAGGER_API_KEY is not set but API_HUB_API_KEY is, use the legacy variable
  const legacyApiKey = getEnv("API_HUB_API_KEY");
  if (!getEnv("SWAGGER_API_KEY") && legacyApiKey) {
    // biome-ignore lint/suspicious/noConsole: deprecation warning must reach the operator running the server, not just logs shipped elsewhere
    console.warn(
      "[Swagger] API_HUB_API_KEY is deprecated. Please use SWAGGER_API_KEY instead.",
    );
    setEnv("SWAGGER_API_KEY", legacyApiKey);
  }
}
