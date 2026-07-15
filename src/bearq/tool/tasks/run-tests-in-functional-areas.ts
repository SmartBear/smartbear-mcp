import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { BearqClient } from "../../client.ts";

const inputSchema = z.object({
  functionalAreas: z
    .array(z.union([z.number().int().positive(), z.string().min(1)]))
    .min(1)
    .describe("Functional areas to target, by ID or name."),
  environment: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Target environment name to run tests against. Omit to use the workspace default.",
    ),
});

export class RunTestsInFunctionalAreas extends Tool<BearqClient> {
  specification: ToolParams = {
    title: "Run Tests in Functional Areas",
    toolset: "Tasks",
    summary:
      "Runs every regression test case tagged with one or more functional areas. Functional areas can be given by ID or name.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { functionalAreas, environment } = inputSchema.parse(args);
    const body: Record<string, unknown> = {
      agent: "tester",
      mode: "run",
      functionalAreas,
    };
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
