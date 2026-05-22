import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BearQClient } from "../../client";

const inputSchema = z.object({
  instruction: z
    .string()
    .min(1)
    .describe(
      "Natural language instruction to send to the BearQ QA lead agent.",
    ),
});

export class ChatWithQaLead extends Tool<BearQClient> {
  specification: ToolParams = {
    title: "Chat with QA Lead",
    summary:
      "Sends an open-ended instruction to BearQ's QA lead agent. Use this when no other BearQ tool fits — the QA lead can list, create, and update test cases, manage functional areas, and read the application model, and acts as a general-purpose escape hatch.",
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { instruction } = inputSchema.parse(args);
    const res = await fetch(`${this.client.getBaseUrl()}/tasks`, {
      method: "POST",
      headers: this.client.getHeaders(),
      body: JSON.stringify({ agent: "qa-lead", instruction }),
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
