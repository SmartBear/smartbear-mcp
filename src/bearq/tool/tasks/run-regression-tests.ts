import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({});

export class RunRegressionTests extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Run Regression Tests",
    toolset: "Tasks",
    summary:
      "Runs the full BearQ regression suite — every regression-ready test case in the workspace. Use for CI/CD or pre-release smoke.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (_args) => {
    const res = await fetch(`${this.client.getBaseUrl()}/tasks`, {
      method: "POST",
      headers: this.client.getHeaders(),
      body: JSON.stringify({ agent: "tester", mode: "run" }),
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
