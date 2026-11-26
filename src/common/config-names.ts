/**
 * Naming conventions that map a client's config keys to environment variables
 * and HTTP headers. Shared by the stdio/HTTP transports and the
 * `smartbear_list_integrations` tool.
 */

export function getEnvVarName(clientPrefix: string, key: string): string {
  return `${clientPrefix.toUpperCase().replace(/-/g, "_")}_${key.toUpperCase()}`;
}

/**
 * Convert a config key to HTTP header name format
 *
 * Examples:
 * - auth_token -> Auth-Token
 * - project_api_key -> Project-Api-Key
 * - base_url -> Base-Url
 *
 * Combined with configPrefix: Bugsnag-Auth-Token, Reflect-Api-Token, etc.
 *
 * @param clientPrefix The client's configPrefix
 * @param key The config key in snake_case
 * @returns Header name in format: {ConfigPrefix}-{Pascal-Kebab-Case}
 */
export function getHeaderName(clientPrefix: string, key: string): string {
  return `${clientPrefix}-${key
    .split("_")
    .map(
      (part: string) =>
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("-")}`;
}
