/**
 * Check a URL against the operator-configured MCP_ALLOWED_ENDPOINTS list.
 * Entries are comma-separated; an entry wrapped in `/.../` is a regex,
 * anything else is an exact match.
 *
 * @returns `undefined` when MCP_ALLOWED_ENDPOINTS is not configured,
 * otherwise whether `value` matches an entry.
 */
export function matchAllowedEndpoints(value: string): boolean | undefined {
  const allowedEndpoints = process.env.MCP_ALLOWED_ENDPOINTS?.split(",");
  if (!allowedEndpoints) return undefined;
  for (const endpoint of allowedEndpoints) {
    const trimmed = endpoint.trim();
    if (trimmed.startsWith("/") && trimmed.endsWith("/")) {
      try {
        if (new RegExp(trimmed.slice(1, -1)).test(value)) return true;
      } catch (error) {
        console.warn(
          `Invalid regex pattern in MCP_ALLOWED_ENDPOINTS: ${trimmed}, error: ${error}`,
        );
      }
    } else if (value === trimmed) {
      return true;
    }
  }
  return false;
}
