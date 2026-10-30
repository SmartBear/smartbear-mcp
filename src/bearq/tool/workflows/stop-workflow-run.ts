import { z } from "zod";
import { Tool, ToolError, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import { problemSuffix } from "../../api";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  runId: z
    .number()
    .int()
    .positive()
    .describe("BearQ workflow run ID to cancel."),
});

export class StopWorkflowRun extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Stop Workflow Run",
    toolset: "Workflows",
    summary:
      "Cancels a workflow run that is in flight, returning { runId, cancelled: true }. Fails with an error when the run has already finished or does not exist.",
    inputSchema,
  };

  handle: ToolHandler = async (args) => {
    const { runId } = inputSchema.parse(args);
    const res = await fetch(
      `${this.client.getBaseUrl()}/workflow-runs/${runId}`,
      { method: "DELETE", headers: this.client.getHeaders() },
    );
    if (!res.ok)
      throw new ToolError(
        `DELETE /workflow-runs/${runId} failed: ${res.status} ${res.statusText}` +
          (await problemSuffix(res)),
      );
    return {
      content: [
        { type: "text", text: JSON.stringify({ runId, cancelled: true }) },
      ],
    };
  };
}
