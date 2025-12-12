import packageJson from "../../package.json" with { type: "json" };

/**
 * Release stage used for BugSnag instrumentation.
 * This is set to "production" by the build:production script when published.
 */
const MCP_SERVER_RELEASE_STAGE = "development";

/**
 * Default BugSnag API key used if none is provided via environment variable.
 */
const DEFAULT_BUGSNAG_API_KEY = "4f38d9f60eebf04425aad7d9bf1292bf";

export function getServerName(): string {
  return packageJson.config.mcpServerName;
}

export function getServerVersion(): string {
  return packageJson.version;
}

export function getUserAgent(): string {
  return `${getServerName()}/${getServerVersion()}`;
}

export function getReleaseStage(): string {
  return MCP_SERVER_RELEASE_STAGE;
}

export function getTransportMode(): string {
  return process.env.MCP_TRANSPORT?.toLowerCase() || "stdio";
}

export function getAllowedEndpoints(): string[] | null {
  const allowedEndpointsEnv = process.env.MCP_ALLOWED_ENDPOINTS?.trim();
  if (!allowedEndpointsEnv) {
    // Empty or not set = all endpoints allowed
    return null;
  }
  return allowedEndpointsEnv.split(",");
}

export function getEnabledClients(): Set<string> | null {
  const enabledClientsEnv = process.env.MCP_CLIENTS?.trim();
  if (!enabledClientsEnv) {
    // Empty or not set = all clients enabled
    return null;
  }
  // Parse comma-separated list and normalize to lowercase for comparison
  return new Set(
    enabledClientsEnv
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name.length > 0),
  );
}

export function getBugsnagApiKey(): string | null {
  const apiKey = process.env.MCP_SERVER_BUGSNAG_API_KEY;
  if (apiKey === undefined) {
    return DEFAULT_BUGSNAG_API_KEY;
  } else if (apiKey === "") {
    return null; // Disable instrumentation if config value is set but empty
  } else {
    return apiKey;
  }
}
