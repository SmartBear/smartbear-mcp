import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  taskId: z.number().int().positive().describe("BearQ task ID to cancel."),
});

export class StopTask extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Stop Task",
    toolset: "Tasks",
    summary: "Cancels a running task.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { taskId } = inputSchema.parse(args);
    const res = await fetch(`${this.client.getBaseUrl()}/tasks/${taskId}`, {
      method: "DELETE",
      headers: this.client.getHeaders(),
    });
    if (!res.ok)
      throw new ToolError(
        `DELETE /tasks/${taskId} failed: ${res.status} ${res.statusText}`,
      );
    return {
      content: [{ type: "text", text: JSON.stringify(await res.json()) }],
    };
  };
}
