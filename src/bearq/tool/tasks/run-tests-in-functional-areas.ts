import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  functionalAreas: z
    .array(z.union([z.number().int().positive(), z.string().min(1)]))
    .min(1)
    .describe("Functional areas to target, by ID or name."),
});

export class RunTestsInFunctionalAreas extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Run Tests in Functional Areas",
    summary:
      "Runs every regression test case tagged with one or more functional areas. Functional areas can be given by ID or name.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { functionalAreas } = inputSchema.parse(args);
    const res = await fetch(`${this.client.getBaseUrl()}/tasks`, {
      method: "POST",
      headers: this.client.getHeaders(),
      body: JSON.stringify({ agent: "tester", mode: "run", functionalAreas }),
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
