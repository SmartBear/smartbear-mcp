import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  functionalArea: z
    .union([z.number().int().positive(), z.string().min(1)])
    .optional()
    .describe(
      "Functional area to scope the exploration to, by ID or name. Omit to explore the entire application.",
    ),
});

export class ExpandApplicationModel extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Expand Application Model",
    summary:
      "Explores the live application to discover or update its pages and elements in BearQ's application model. Optionally scope to a single functional area.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { functionalArea } = inputSchema.parse(args);
    const body: Record<string, unknown> = { agent: "explorer" };
    if (functionalArea !== undefined) body.functionalArea = functionalArea;
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
