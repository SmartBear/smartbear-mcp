import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type ZodRawShape, z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";
import { API_HOSTNAME } from "../../config/constants";

export class ListSuites extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "List Suites",
    toolset: "Suites",
    summary: "Retrieve a list of all reflect suites available",
    inputSchema: z.object({}),
  };

  handle: ToolCallback<ZodRawShape> = async (_args) => {
    const response = await fetch(`https://${API_HOSTNAME}/v1/suites`, {
      method: "GET",
      headers: this.client.getHeaders(),
    });

    if (!response.ok) {
      throw new ToolError(
        `Failed to list suites: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  };
}
