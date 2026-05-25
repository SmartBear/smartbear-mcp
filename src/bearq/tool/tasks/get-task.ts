import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  taskId: z.number().int().positive().describe("BearQ task ID."),
});

export class GetTask extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Get Task",
    summary:
      "Retrieves a task's current state, metadata, and activity log. Returns immediately with whatever's available — does not block on the task completing.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { taskId } = inputSchema.parse(args);
    const res = await fetch(`${this.client.getBaseUrl()}/tasks/${taskId}`, {
      method: "GET",
      headers: this.client.getHeaders(),
    });
    if (!res.ok)
      throw new ToolError(
        `GET /tasks/${taskId} failed: ${res.status} ${res.statusText}`,
      );
    return {
      content: [{ type: "text", text: JSON.stringify(await res.json()) }],
    };
  };
}
