import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { ReflectClient } from "../../client.ts";
import { API_HOSTNAME } from "../../config/constants.ts";

export class ListSuiteExecutions extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "List Suite Executions",
    toolset: "Suites",
    summary: "List all executions for a given suite",
    inputSchema: z.object({
      suiteId: z
        .string()
        .describe("ID of the reflect suite to list executions for"),
    }),
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { suiteId } = args as { suiteId: string };
    if (!suiteId) {
      throw new ToolError("suiteId argument is required");
    }

    const response = await fetch(
      `https://${API_HOSTNAME}/v1/suites/${suiteId}/executions`,
      {
        method: "GET",
        headers: this.client.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(
        `Failed to list suite executions: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  };
}
