import { z } from "zod";
import { Tool, ToolError, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({});

export class ListWorkflows extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "List Workflows",
    toolset: "Workflows",
    summary:
      "Lists the workflows in the workspace — each with its id, name, description, steps, and last run. Workspaces with more than 100 workflows are truncated; the response's totalCount says how many exist.",
    inputSchema,
    readOnly: true,
  };

  handle: ToolHandler = async (_args) => {
    const res = await fetch(`${this.client.getBaseUrl()}/workflows?size=100`, {
      method: "GET",
      headers: this.client.getHeaders(),
    });
    if (!res.ok)
      throw new ToolError(
        `GET /workflows failed: ${res.status} ${res.statusText}`,
      );
    return {
      content: [{ type: "text", text: JSON.stringify(await res.json()) }],
    };
  };
}
