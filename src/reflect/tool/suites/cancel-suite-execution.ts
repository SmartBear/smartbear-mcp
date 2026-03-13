import { z } from "zod";
import { ToolError, TypesafeTool } from "../../../common/tools";
import type { ReflectClient } from "../../client";
import { API_HOSTNAME } from "../../config/constants";

export const cancelSuiteExecution = new TypesafeTool(
  {
    title: "Cancel Suite Execution",
    summary: "Cancel a reflect suite execution",
    inputSchema: z.object({
      suiteId: z
        .string()
        .describe("ID of the reflect suite to cancel execution for"),
      executionId: z
        .string()
        .describe("ID of the reflect suite execution to cancel"),
    }),
  },

  (client: ReflectClient) => async (args) => {
    const { suiteId, executionId } = args;
    if (!suiteId || !executionId) {
      throw new ToolError(
        "Both suiteId and executionId arguments are required",
      );
    }

    const response = await fetch(
      `https://${API_HOSTNAME}/v1/suites/${suiteId}/executions/${executionId}/cancel`,
      {
        method: "PATCH",
        headers: client.getHeaders(),
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
  },
);
