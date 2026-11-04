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
  if (allowedEndpoints) {
    for (const endpoint of allowedEndpoints) {
      const trimmedEndpoint = endpoint.trim();

      // Check if this is a regex pattern (wrapped in /)
      if (
        trimmedEndpoint.startsWith("/") &&
        trimmedEndpoint.endsWith("/")
      ) {
        try {
          const pattern = trimmedEndpoint.slice(1, -1); // Remove leading/trailing /
          const regex = new RegExp(pattern);
          if (regex.test(value)) {
            return true; 
          }
        } catch (error) {
          console.warn(
            `Invalid regex pattern in MCP_ALLOWED_ENDPOINTS: ${trimmedEndpoint}, error: ${error}`,
          );
        }
      } else {
        // Exact match
        if (value === trimmedEndpoint) {
          return true;
        }
      }
    }
  }
  return false;
}
