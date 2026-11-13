import { z } from "zod";
import { Tool, ToolError, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  workflow: z
    .string()
    .min(1)
    .describe(
      "Workflow to run: its name (case-insensitive) or its numeric workflow ID.",
    ),
});

type PublicWorkflow = { id: number; name: string };

/**
 * Resolves the `workflow` input to a workflow ID. A bare run of digits is used
 * as the ID as-is; anything else is matched against workflow names by walking
 * GET /workflows pages.
 */
async function resolveWorkflowId(
  client: BearQClient,
  workflow: string,
): Promise<number> {
  if (/^\d+$/.test(workflow)) return Number(workflow);

  const names: string[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(
      `${client.getBaseUrl()}/workflows?page=${page}&size=100`,
      { method: "GET", headers: client.getHeaders() },
    );
    if (!res.ok)
      throw new ToolError(
        `GET /workflows failed: ${res.status} ${res.statusText}`,
      );
    const body = (await res.json()) as {
      workflows: PublicWorkflow[];
      totalCount: number;
    };
    const match = body.workflows.find(
      (candidate) =>
        candidate.name.toLowerCase() === workflow.toLowerCase().trim(),
    );
    if (match) return match.id;
    names.push(...body.workflows.map((candidate) => candidate.name));
    if (body.workflows.length === 0 || names.length >= body.totalCount) break;
  }
  throw new ToolError(
    `No BearQ workflow named "${workflow}". Available workflows: ${
      names.join(", ") || "(none)"
    }`,
  );
}

export class RunWorkflow extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Run Workflow",
    toolset: "Workflows",
    summary:
      "Starts a run of a BearQ workflow now and returns the run (id, status, timestamps). If a run of that workflow is already in flight, no new run is started and the in-flight run is returned with started: false. Poll the run's progress with bearq_get_workflow_run.",
    inputSchema,
  };

  handle: ToolHandler = async (args) => {
    const { workflow } = inputSchema.parse(args);
    const workflowId = await resolveWorkflowId(this.client, workflow);
    const res = await fetch(
      `${this.client.getBaseUrl()}/workflows/${workflowId}/runs`,
      { method: "POST", headers: this.client.getHeaders() },
    );
    if (!res.ok)
      throw new ToolError(
        `POST /workflows/${workflowId}/runs failed: ${res.status} ${res.statusText}`,
      );
    return {
      content: [{ type: "text", text: JSON.stringify(await res.json()) }],
    };
  };
}
