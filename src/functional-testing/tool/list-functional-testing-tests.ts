import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ZodRawShape, z } from "zod";
import { Tool, ToolError } from "../../common/tools";
import type { ToolParams } from "../../common/types";
import type { FunctionalTestingClient } from "../client";
import { API_HOSTNAME } from "../config/constants";

export class ListFunctionalTestingTests extends Tool<FunctionalTestingClient> {
  specification: ToolParams = {
    title: "List Functional Testing Tests",
    summary: "List all SmartBear Functional Testing tests",
    inputSchema: z.object({}),
  };

  handle: ToolCallback<ZodRawShape> = async (_args) => {
    const response = await fetch(`https://${API_HOSTNAME}/v1/tests`, {
      method: "GET",
      headers: this.client.getHeaders(),
    });

    if (!response.ok) {
      throw new ToolError(
        `Failed to list functional testing tests: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  };
}