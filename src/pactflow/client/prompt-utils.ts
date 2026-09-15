import type { OpenAPI } from "./ai";
import { OADMatcherPrompt } from "./prompts";

export interface PromptExecutionResult {
  requiresPromptExecution: true;
  prompt: string;
  instructions: string;
}

/**
 * Checks if a value is a prompt execution result.
 *
 * @param value - The value to check
 * @returns true if the value is a PromptExecutionResult
 */
export function isPromptExecutionResult(
  value: unknown,
): value is PromptExecutionResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "requiresPromptExecution" in value &&
    (value as PromptExecutionResult).requiresPromptExecution === true
  );
}

/**
 * Builds a request asking the host AI application to generate an OpenAPI
 * matcher recommendation and re-request the tool with the result.
 *
 * MCP's Sampling capability (previously used here to generate matcher
 * recommendations server-side) was deprecated in the 2026-07-28 spec
 * revision (SEP-2577), so this now always delegates prompt execution to
 * the host rather than attempting a `sampling/createMessage` request.
 *
 * @param openAPI The OpenAPI document to analyze.
 * @returns A prompt execution result instructing the host to run the prompt.
 */
export function getOADMatcherRecommendations(
  openAPI: OpenAPI,
): PromptExecutionResult {
  return {
    requiresPromptExecution: true,
    prompt: OADMatcherPrompt.replace("{0}", JSON.stringify(openAPI)),
    instructions:
      "Please execute the above prompt using your AI capabilities and re-request this tool with the result. " +
      "Include the prompt result in your next request to continue the operation.",
  };
}
