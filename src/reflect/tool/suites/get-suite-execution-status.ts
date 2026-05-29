import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import { API_HOSTNAME } from "../../config/constants";

export class GetSuiteExecutionStatus extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Get Suite Execution Status",
    toolset: "Suites",
    summary: "Get the status of a reflect suite execution",
    inputSchema: z.object({
      suiteId: z
        .string()
        .describe("ID of the reflect suite to get execution status for"),
      executionId: z
        .string()
        .describe("ID of the reflect suite execution to get status for"),
    }),
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { suiteId, executionId } = args as {
      suiteId: string;
      executionId: string;
    };
    if (!suiteId || !executionId) {
      throw new ToolError(
        "Both suiteId and executionId arguments are required",
      );
    }

    const response = await fetch(
      `https://${API_HOSTNAME}/v1/suites/${suiteId}/executions/${executionId}`,
      {
        method: "GET",
        headers: this.client.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(
        `Failed to get suite execution status: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  };
}
