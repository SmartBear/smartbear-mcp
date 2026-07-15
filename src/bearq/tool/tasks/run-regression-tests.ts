import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { BearqClient } from "../../client.ts";

const inputSchema = z.object({
  environment: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Target environment name to run tests against. Omit to use the workspace default.",
    ),
});

export class RunRegressionTests extends Tool<BearqClient> {
  specification: ToolParams = {
    title: "Run Regression Tests",
    toolset: "Tasks",
    summary:
      "Runs the full BearQ regression suite — every regression-ready test case in the workspace. Use for CI/CD or pre-release smoke.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { environment } = inputSchema.parse(args);
    const body: Record<string, unknown> = { agent: "tester", mode: "run" };
    if (environment !== undefined) {
      body.environment = environment;
    }
    const res = await fetch(`${this.client.getBaseUrl()}/tasks`, {
      method: "POST",
      headers: this.client.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new ToolError(
        `POST /tasks failed: ${res.status} ${res.statusText}`,
      );
    }
    return {
      content: [{ type: "text", text: JSON.stringify(await res.json()) }],
    };
  };
}
