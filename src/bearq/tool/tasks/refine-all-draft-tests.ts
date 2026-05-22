import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({});

export class RefineAllDraftTests extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Refine All Draft Tests",
    summary:
      "Refines every draft test case in the workspace. Use to push an entire draft backlog forward; may take multiple passes before all drafts are ready to be promoted to regression tests.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (_args) => {
    const res = await fetch(`${this.client.getBaseUrl()}/tasks`, {
      method: "POST",
      headers: this.client.getHeaders(),
      body: JSON.stringify({ agent: "tester", mode: "refine" }),
    });
    if (!res.ok)
      throw new ToolError(
        `POST /tasks failed: ${res.status} ${res.statusText}`,
      );
    return {
      content: [{ type: "text", text: JSON.stringify(await res.json()) }],
    };
  };
}
