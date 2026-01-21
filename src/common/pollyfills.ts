import type { RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ElicitRequest,
  ElicitResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { SmartBearMcpServer } from "./server";
import { ToolError } from "./tools";

export interface SamplingPolyfillResult {
  requiresPromptExecution: true;
  prompt: string;
  instructions: string;
}

export interface ElicitationPolyfillResult {
  requiresInputCollection: true;
  inputRequest: ElicitRequest["params"];
  instructions: string;
}

/**
 * Attempts to execute a sampling request. If sampling is not available,
 * returns a polyfill result instructing the host to execute the prompt
 * and re-request the tool.
 *
 * @param server - The MCP server instance
 * @param prompt - The prompt to execute
 * @param maxTokens - Maximum tokens for the response
 * @returns Either the sampling response text or a polyfill result
 * @throws ToolError if sampling fails or response format is unexpected
 */
export async function executeSamplingOrPolyfill(
  server: SmartBearMcpServer,
  prompt: string,
  maxTokens = 1000,
): Promise<string | SamplingPolyfillResult> {
  if (!server.isSamplingSupported()) {
    return createPolyfillResult(prompt);
  }

  try {
    const response = await server.server.createMessage({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: prompt,
          },
        },
      ],
      maxTokens,
    });

    const content = response.content;
    if (content.type !== "text") {
      throw new ToolError(
        `Received unexpected response type from sampling: ${content.type}`,
      );
    }

    return content.text;
  } catch (error) {
    console.error(error);
    return createPolyfillResult(prompt);
  }
}

/**
 * Creates a polyfill result that instructs the host AI application to
 * execute the prompt and re-request the tool.
 *
 * @param prompt - The prompt to be executed
 * @returns A polyfill result object
 */
function createPolyfillResult(prompt: string): SamplingPolyfillResult {
  return {
    requiresPromptExecution: true,
    prompt,
    instructions:
      "Please execute the above prompt using your AI capabilities and re-request this tool with the result. " +
      "Include the prompt result in your next request to continue the operation.",
  };
}

/**
 * Checks if a value is a sampling polyfill result.
 *
 * @param value - The value to check
 * @returns true if the value is a SamplingPolyfillResult
 */
export function isSamplingPolyfillResult(
  value: unknown,
): value is SamplingPolyfillResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "requiresPromptExecution" in value &&
    (value as SamplingPolyfillResult).requiresPromptExecution === true
  );
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
