import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { ReflectClient } from "../../client.ts";
import { API_HOSTNAME } from "../../config/constants.ts";

export class CancelSuiteExecution extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Cancel Suite Execution",
    toolset: "Suites",
    summary: "Cancel a reflect suite execution",
    inputSchema: z.object({
      suiteId: z
        .string()
        .describe("ID of the reflect suite to cancel execution for"),
      executionId: z
        .string()
        .describe("ID of the reflect suite execution to cancel"),
    }),
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { suiteId, executionId } = args as {
      suiteId: string;
      executionId: string;
    };
    if (!(suiteId && executionId)) {
      throw new ToolError(
        "Both suiteId and executionId arguments are required",
      );
    }

    const response = await fetch(
      `https://${API_HOSTNAME}/v1/suites/${suiteId}/executions/${executionId}/cancel`,
      {
        method: "PATCH",
        headers: this.client.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(
        `Failed to cancel suite execution: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  };
}
