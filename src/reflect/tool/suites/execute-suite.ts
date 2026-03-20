import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import { API_HOSTNAME } from "../../config/constants";

export class ExecuteSuite extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Execute Suite",
    summary: "Execute a reflect suite",
    parameters: [
      {
        name: "suiteId",
        type: z.string(),
        description: "ID of the reflect suite to execute",
        required: true,
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { suiteId } = args as { suiteId: string };
    if (!suiteId) throw new ToolError("suiteId argument is required");

    const response = await fetch(
      `https://${API_HOSTNAME}/v1/suites/${suiteId}/executions`,
      {
        method: "POST",
        headers: this.client.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(
        `Failed to execute suite: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  };
}
