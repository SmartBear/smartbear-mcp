import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function getToolResult<T>(toolResult: CallToolResult): T {
  const content = toolResult.content.find((c) => c.type === "text");
  if (!content) {
    throw new Error(
      `Expected text content, but got ${toolResult.content[0].type}`,
    );
  }
  return JSON.parse(content.text) as T;
}
