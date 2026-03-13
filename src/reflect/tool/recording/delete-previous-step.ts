import { randomUUID } from "node:crypto";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { ReflectClient } from "../../client";

export class DeletePreviousStep extends Tool<ReflectClient> {
  specification: ToolParams = {
    title: "Delete Previous Step",
    summary:
      "Delete the last step added to an active Reflect recording session",
    readOnly: false,
    idempotent: false,
    destructive: true,
    parameters: [
      {
        name: "sessionId",
        type: z.string(),
        description: "The ID of the Reflect recording session",
        required: true,
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args) => {
    const { sessionId } = args as { sessionId: string };
    if (!sessionId) throw new ToolError("sessionId argument is required");

    const wsManager = this.client.getConnectedSession(sessionId);

    const id = randomUUID();
    const responsePromise = wsManager.waitForResponse(id);
    await wsManager.sendMcpMessage({
      type: "mcp:delete-step",
      id,
    });

    await responsePromise;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            sessionId,
            message: "Successfully deleted previous step",
          }),
        },
      ],
    };
  };
}
