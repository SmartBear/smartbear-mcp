import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { BearQClient } from "../../client.ts";

const inputSchema = z.object({
  testCaseIds: z
    .array(z.number().int().positive())
    .min(1)
    .describe("IDs of BearQ draft test cases to refine."),
});

export class RefineTestCases extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Refine Test Cases",
    toolset: "Tasks",
    summary:
      "Refines specific BearQ draft test cases — improves their steps so they can eventually be promoted to regression tests. Use when a draft is incomplete or has drifted from its intent.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCaseIds } = inputSchema.parse(args);
    const res = await fetch(`${this.client.getBaseUrl()}/tasks`, {
      method: "POST",
      headers: this.client.getHeaders(),
      body: JSON.stringify({ agent: "tester", mode: "refine", testCaseIds }),
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
