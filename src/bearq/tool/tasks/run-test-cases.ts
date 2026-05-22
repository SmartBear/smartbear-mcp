import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  testCaseIds: z
    .array(z.number().int().positive())
    .min(1)
    .describe("IDs of BearQ regression test cases to run."),
});

export class RunTestCases extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Run Test Cases",
    summary:
      "Runs specific BearQ regression test cases by ID. Targets only regression-ready cases — drafts will be rejected.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCaseIds } = inputSchema.parse(args);
    const res = await fetch(`${this.client.getBaseUrl()}/tasks`, {
      method: "POST",
      headers: this.client.getHeaders(),
      body: JSON.stringify({ agent: "tester", mode: "run", testCaseIds }),
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
