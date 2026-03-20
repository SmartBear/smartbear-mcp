import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import { API_HOSTNAME } from "../../config/constants";

export class RunTest extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Run Test",
    summary: "Run a reflect test",
    parameters: [
      {
        name: "testId",
        type: z.string(),
        description: "ID of the reflect test to run",
        required: true,
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testId } = args as { testId: string };
    if (!testId) throw new ToolError("testId argument is required");

    const response = await fetch(
      `https://${API_HOSTNAME}/v1/tests/${testId}/executions`,
      {
        method: "POST",
        headers: this.client.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(
        `Failed to run test: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  };
}
