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
    .describe("IDs of BearQ regression test cases to run."),
  environment: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Target environment name to run tests against. Omit to use the workspace default.",
    ),
});

export class RunTestCases extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Run Test Cases",
    toolset: "Tasks",
    summary:
      "Runs specific BearQ regression test cases by ID. Targets only regression-ready cases — drafts will be rejected.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { testCaseIds, environment } = inputSchema.parse(args);
    const body: Record<string, unknown> = {
      agent: "tester",
      mode: "run",
      testCaseIds,
    };
    if (environment !== undefined) body.environment = environment;
    const res = await fetch(`${this.client.getBaseUrl()}/tasks`, {
      method: "POST",
      headers: this.client.getHeaders(),
      body: JSON.stringify(body),
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
