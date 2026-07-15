import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { BearQClient } from "../../client.ts";

const inputSchema = z.object({});

export class ListEnvironments extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "List Environments",
    toolset: "Environments",
    summary:
      "Lists the environments configured in the workspace. Use this to discover valid environment names to pass to the test-running tools, and to identify the workspace default.",
    inputSchema,
    readOnly: true,
  };

  handle: ToolCallback<ZodRawShape> = async (_args) => {
    const res = await fetch(`${this.client.getBaseUrl()}/environments`, {
      method: "GET",
      headers: this.client.getHeaders(),
    });
    if (!res.ok)
      throw new ToolError(
        `GET /environments failed: ${res.status} ${res.statusText}`,
      );
    return {
      content: [{ type: "text", text: JSON.stringify(await res.json()) }],
    };
  };
}
