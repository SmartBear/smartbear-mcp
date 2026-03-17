import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import { API_HOSTNAME } from "../../config/constants";

export class CancelSuiteExecution extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Cancel Suite Execution",
    summary: "Cancel a reflect suite execution",
    parameters: [
      {
        name: "suiteId",
        type: z.string(),
        description: "ID of the reflect suite to cancel execution for",
        required: true,
      },
      {
        name: "executionId",
        type: z.string(),
        description: "ID of the reflect suite execution to cancel",
        required: true,
      },
    ],
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
