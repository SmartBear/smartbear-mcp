/**
 * Configuration utilities for Swagger client
 * Handles backward compatibility with legacy environment variables
 */

/**
 * Apply API_HUB_API_KEY fallback to SWAGGER_API_KEY if needed
 * This modifies process.env to enable backward compatibility
 * @deprecated API_HUB_API_KEY support - TODO: Remove after migration period (May 2026)
 */
export function applySwaggerApiKeyFallback(): void {
  // If SWAGGER_API_KEY is not set but API_HUB_API_KEY is, use the legacy variable
  if (!process.env.SWAGGER_API_KEY && process.env.API_HUB_API_KEY) {
    console.warn(
      "[Swagger] API_HUB_API_KEY is deprecated. Please use SWAGGER_API_KEY instead.",
    );
    process.env.SWAGGER_API_KEY = process.env.API_HUB_API_KEY;
  }
}

// Apply the fallback immediately when this module is imported
applySwaggerApiKeyFallback();

