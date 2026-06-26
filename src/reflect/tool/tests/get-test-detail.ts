import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import { API_HOSTNAME } from "../../config/constants";

export class GetTestDetail extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Get Test Detail",
    toolset: "Tests",
    summary:
      "Get the full detail of a reflect test, including its name, description, and all recorded steps",
    inputSchema: z.object({
      testId: z
        .string()
        .describe("ID of the reflect test to retrieve details for"),
    }),
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testId } = args as { testId: string };
    if (!testId || !testId.trim())
      throw new ToolError("testId argument is required");

    const response = await fetch(
      `https://${API_HOSTNAME}/v1/tests/${encodeURIComponent(testId)}`,
      {
        method: "GET",
        headers: this.client.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new ToolError(
        `Failed to get test detail: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  };
}
