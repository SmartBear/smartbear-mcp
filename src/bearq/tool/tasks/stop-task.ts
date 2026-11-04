import { z } from "zod";
import { Tool, ToolError, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import { problemSuffix } from "../../api";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  taskId: z.number().int().positive().describe("BearQ task ID to cancel."),
});

export class StopTask extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Stop Task",
    toolset: "Tasks",
    summary:
      "Cancels a pending or running task, returning { taskId, stopped: true }. The public API accepts a stop of an already-finished task as a success no-op, so this does not guarantee the task was running — check the task's status separately if that matters.",
    inputSchema,
  };

  handle: ToolHandler = async (args) => {
    const { taskId } = inputSchema.parse(args);
    const res = await fetch(`${this.client.getBaseUrl()}/tasks/${taskId}`, {
      method: "DELETE",
      headers: this.client.getHeaders(),
    });
    if (!res.ok)
      throw new ToolError(
        `DELETE /tasks/${taskId} failed: ${res.status} ${res.statusText}` +
          (await problemSuffix(res)),
      );
    return {
      content: [
        { type: "text", text: JSON.stringify({ taskId, stopped: true }) },
      ],
    };
  };
}
