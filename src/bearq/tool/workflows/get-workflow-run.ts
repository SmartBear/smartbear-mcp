import { z } from "zod";
import { Tool, ToolError, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  runId: z.number().int().positive().describe("BearQ workflow run ID."),
});

export class GetWorkflowRun extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Get Workflow Run",
    toolset: "Workflows",
    summary:
      "Retrieves a workflow run's current status, per-step progress, and stats (tasks, tests, discovery, ACUs). Returns immediately with whatever's available — does not block on the run completing.",
    inputSchema,
    readOnly: true,
  };

  handle: ToolHandler = async (args) => {
    const { runId } = inputSchema.parse(args);
    const res = await fetch(
      `${this.client.getBaseUrl()}/workflow-runs/${runId}`,
      { method: "GET", headers: this.client.getHeaders() },
    );
    if (!res.ok)
      throw new ToolError(
        `GET /workflow-runs/${runId} failed: ${res.status} ${res.statusText}`,
      );
    return {
      content: [{ type: "text", text: JSON.stringify(await res.json()) }],
    };
  };
}
