import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { LoadNinjaClient } from "../../client";

const inputSchema = z.object({
  name: z
    .string()
    .min(4)
    .max(30)
    .describe("Project name. Must be unique within the account."),
  description: z
    .string()
    .min(1)
    .max(146)
    .describe("Project description."),
});

export class CreateProject extends Tool<LoadNinjaClient> {
  specification: ToolParams = {
    title: "Create Project",
    summary: "Creates a new project in the LoadNinja account.",
    inputSchema,
    readOnly: false,
    destructive: false,
    idempotent: false,
    examples: [
      {
        description: "Create a new project",
        parameters: {
          name: "My Load Tests",
          description: "Performance tests for the checkout flow",
        },
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const params = inputSchema.parse(args);
    const res = await fetch(`${this.client.getBaseUrl()}/project`, {
      method: "POST",
      headers: this.client.getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok)
      throw new ToolError(
        `POST /project failed: ${res.status} ${res.statusText}`,
      );
    return {
      content: [{ type: "text", text: JSON.stringify(await res.json()) }],
    };
  };
}
