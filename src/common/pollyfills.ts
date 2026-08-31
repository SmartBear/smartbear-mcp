import type {
  ElicitRequest,
  ElicitResult,
  RequestOptions,
} from "@modelcontextprotocol/server";
import type { SmartBearMcpServer } from "./server";

export interface ElicitationPolyfillResult {
  requiresInputCollection: true;
  inputRequest: ElicitRequest["params"];
  instructions: string;
}

/**
 * Attempts to execute an elicitation request. If elicitation is not available,
 * returns a polyfill result instructing the host to collect the input
 * and re-request the tool.
 *
 * @param server - The MCP server instance
 * @param params - The elicitation request parameters
 * @param options - Optional request options
 * @returns Either the elicitation result or a polyfill result
 * @throws ToolError if elicitation fails unexpectedly
 */
export async function executeElicitationOrPolyfill(
  server: SmartBearMcpServer,
  params: ElicitRequest["params"],
  options?: RequestOptions,
): Promise<ElicitResult | ElicitationPolyfillResult> {
  if (!server.isElicitationSupported()) {
    return createElicitationPolyfillResult(params);
  }

  try {
    return await server.server.elicitInput(params, options);
  } catch (error) {
    console.error(error);
    return createElicitationPolyfillResult(params);
  }
}

/**
 * Creates a polyfill result that instructs the host AI application to
 * collect the requested input and re-request the tool.
 *
 * @param params - The elicitation request parameters
 * @returns A polyfill result object
 */
function createElicitationPolyfillResult(
  params: ElicitRequest["params"],
): ElicitationPolyfillResult {
  return {
    requiresInputCollection: true,
    inputRequest: params,
    instructions:
      "Please collect the requested input from the user and re-request this tool with the collected values. " +
      "Include the input results in your next request to continue the operation.",
  };
}

/**
 * Checks if a value is an elicitation polyfill result.
 *
 * @param value - The value to check
 * @returns true if the value is an ElicitationPolyfillResult
 */
export function isElicitationPolyfillResult(
  value: unknown,
): value is ElicitationPolyfillResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "requiresInputCollection" in value &&
    (value as ElicitationPolyfillResult).requiresInputCollection === true
  );
}
