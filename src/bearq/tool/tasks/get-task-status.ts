import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  taskId: z.number().int().positive().describe("BearQ task ID."),
});

export class GetTaskStatus extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Get Task Status",
    toolset: "Tasks",
    summary:
      "Retrieves the status of a task (running / complete / error / cancelled). Cheaper than fetching full task details.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { taskId } = inputSchema.parse(args);
    const res = await fetch(
      `${this.client.getBaseUrl()}/tasks/${taskId}/status`,
      {
        method: "GET",
        headers: this.client.getHeaders(),
      },
    );
    if (!res.ok)
      throw new ToolError(
        `GET /tasks/${taskId}/status failed: ${res.status} ${res.statusText}`,
      );
    return {
      content: [{ type: "text", text: JSON.stringify(await res.json()) }],
    };
  };
}
