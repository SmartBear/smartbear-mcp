import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import { API_HOSTNAME } from "../../config/constants";

export class GetTestStatus extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Get Test Status",
    toolset: "Tests",
    summary: "Get the status of a reflect test execution",
    inputSchema: z.object({
      executionId: z
        .string()
        .describe("ID of the reflect test execution to get status for"),
    }),
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { executionId } = args as {
      executionId: string;
    };
    if (!executionId) {
      throw new ToolError("executionId argument is required");
    }

    const response = await fetch(
      `https://${API_HOSTNAME}/v1/executions/${executionId}`,
      {
        method: "GET",
        headers: this.client.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(
        `Failed to get test status: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  };
}
